package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/victoragahi/agora/agora-backend/internal/models"
	_ "modernc.org/sqlite"
)

type DB struct {
	conn *sql.DB
}

func Open(dbPath string) (*DB, error) {
	dir := filepath.Dir(dbPath)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create db directory: %w", err)
		}
	}

	// SQLite connection string with WAL and busy timeout pragmas
	dsn := fmt.Sprintf("%s?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)", dbPath)
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	conn.SetMaxOpenConns(1) // SQLite works best with 1 writer
	conn.SetMaxIdleConns(1)

	database := &DB{conn: conn}
	if err := database.migrate(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return database, nil
}

func (d *DB) Close() error {
	return d.conn.Close()
}

func (d *DB) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		quantity TEXT DEFAULT '',
		category TEXT DEFAULT 'Autre',
		aisle_id TEXT DEFAULT '',
		notes TEXT DEFAULT '',
		completed INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_items_completed ON items(completed);
	CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

	CREATE TABLE IF NOT EXISTS aisle_learnings (
		keyword TEXT PRIMARY KEY,
		aisle_id TEXT NOT NULL,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS aisle_corrections (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		item_name TEXT NOT NULL,
		previous_aisle TEXT DEFAULT '',
		corrected_aisle TEXT NOT NULL,
		corrected_by TEXT DEFAULT 'user',
		reason TEXT DEFAULT '',
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_corrections_created ON aisle_corrections(created_at DESC);
	`
	if _, err := d.conn.Exec(schema); err != nil {
		return err
	}

	// Idempotent column addition for existing databases
	_, _ = d.conn.Exec("ALTER TABLE items ADD COLUMN aisle_id TEXT DEFAULT ''")
	return nil
}

func (d *DB) ListItems(includeCompleted bool) ([]models.Item, error) {
	query := "SELECT id, name, quantity, category, aisle_id, notes, completed, created_at, updated_at FROM items"
	if !includeCompleted {
		query += " WHERE completed = 0"
	}
	query += " ORDER BY completed ASC, updated_at DESC"

	rows, err := d.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.Item
	for rows.Next() {
		var item models.Item
		var compInt int
		var createdAtStr, updatedAtStr string

		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Quantity,
			&item.Category,
			&item.AisleID,
			&item.Notes,
			&compInt,
			&createdAtStr,
			&updatedAtStr,
		); err != nil {
			return nil, err
		}

		item.Completed = compInt == 1
		item.CreatedAt = parseTime(createdAtStr)
		item.UpdatedAt = parseTime(updatedAtStr)

		items = append(items, item)
	}

	if items == nil {
		items = []models.Item{}
	}

	return items, nil
}

func (d *DB) GetItem(id int64) (*models.Item, error) {
	query := "SELECT id, name, quantity, category, aisle_id, notes, completed, created_at, updated_at FROM items WHERE id = ?"
	row := d.conn.QueryRow(query, id)

	var item models.Item
	var compInt int
	var createdAtStr, updatedAtStr string

	if err := row.Scan(
		&item.ID,
		&item.Name,
		&item.Quantity,
		&item.Category,
		&item.AisleID,
		&item.Notes,
		&compInt,
		&createdAtStr,
		&updatedAtStr,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	item.Completed = compInt == 1
	item.CreatedAt = parseTime(createdAtStr)
	item.UpdatedAt = parseTime(updatedAtStr)

	return &item, nil
}

func (d *DB) AddItem(input models.ItemInput) (*models.Item, error) {
	category := strings.TrimSpace(input.Category)
	if category == "" {
		category = DetectCategory(input.Name)
	}

	aisleID := strings.TrimSpace(input.AisleID)

	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	query := `INSERT INTO items (name, quantity, category, aisle_id, notes, completed, created_at, updated_at)
	          VALUES (?, ?, ?, ?, ?, 0, ?, ?)`

	res, err := d.conn.Exec(query, strings.TrimSpace(input.Name), strings.TrimSpace(input.Quantity), category, aisleID, strings.TrimSpace(input.Notes), now, now)
	if err != nil {
		return nil, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return d.GetItem(id)
}

func (d *DB) AddItemsBatch(inputs []models.ItemInput) ([]models.Item, error) {
	tx, err := d.conn.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	stmt, err := tx.Prepare(`INSERT INTO items (name, quantity, category, notes, completed, created_at, updated_at)
	                        VALUES (?, ?, ?, ?, 0, ?, ?)`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	var insertedIDs []int64
	for _, in := range inputs {
		name := strings.TrimSpace(in.Name)
		if name == "" {
			continue
		}
		cat := strings.TrimSpace(in.Category)
		if cat == "" {
			cat = DetectCategory(name)
		}
		res, err := stmt.Exec(name, strings.TrimSpace(in.Quantity), cat, strings.TrimSpace(in.Notes), now, now)
		if err != nil {
			return nil, err
		}
		id, err := res.LastInsertId()
		if err != nil {
			return nil, err
		}
		insertedIDs = append(insertedIDs, id)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	var items []models.Item
	for _, id := range insertedIDs {
		item, err := d.GetItem(id)
		if err == nil && item != nil {
			items = append(items, *item)
		}
	}
	return items, nil
}

func (d *DB) ToggleItem(id int64) (*models.Item, error) {
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	query := `UPDATE items 
	          SET completed = CASE WHEN completed = 1 THEN 0 ELSE 1 END,
	              updated_at = ?
	          WHERE id = ?`
	_, err := d.conn.Exec(query, now, id)
	if err != nil {
		return nil, err
	}
	return d.GetItem(id)
}

func (d *DB) UpdateItem(id int64, input models.UpdateItemInput) (*models.Item, error) {
	existing, err := d.GetItem(id)
	if err != nil || existing == nil {
		return nil, err
	}

	name := existing.Name
	if input.Name != nil {
		name = strings.TrimSpace(*input.Name)
	}
	quantity := existing.Quantity
	if input.Quantity != nil {
		quantity = strings.TrimSpace(*input.Quantity)
	}
	category := existing.Category
	if input.Category != nil {
		category = strings.TrimSpace(*input.Category)
	}
	aisleID := existing.AisleID
	if input.AisleID != nil {
		aisleID = strings.TrimSpace(*input.AisleID)
	}
	notes := existing.Notes
	if input.Notes != nil {
		notes = strings.TrimSpace(*input.Notes)
	}
	completed := existing.Completed
	if input.Completed != nil {
		completed = *input.Completed
	}

	compInt := 0
	if completed {
		compInt = 1
	}

	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	query := `UPDATE items 
	          SET name = ?, quantity = ?, category = ?, aisle_id = ?, notes = ?, completed = ?, updated_at = ?
	          WHERE id = ?`
	_, err = d.conn.Exec(query, name, quantity, category, aisleID, notes, compInt, now, id)
	if err != nil {
		return nil, err
	}

	return d.GetItem(id)
}

func (d *DB) SaveAisleLearning(keyword, aisleID string) error {
	k := strings.ToLower(strings.TrimSpace(keyword))
	a := strings.TrimSpace(aisleID)
	if k == "" || a == "" {
		return nil
	}

	query := `INSERT INTO aisle_learnings (keyword, aisle_id, updated_at)
	          VALUES (?, ?, CURRENT_TIMESTAMP)
	          ON CONFLICT(keyword) DO UPDATE SET aisle_id = excluded.aisle_id, updated_at = CURRENT_TIMESTAMP`
	_, err := d.conn.Exec(query, k, a)
	return err
}

func (d *DB) GetAisleLearnings() (map[string]string, error) {
	rows, err := d.conn.Query("SELECT keyword, aisle_id FROM aisle_learnings")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make(map[string]string)
	for rows.Next() {
		var k, a string
		if err := rows.Scan(&k, &a); err == nil {
			res[k] = a
		}
	}
	return res, nil
}

func (d *DB) DeleteItem(id int64) error {
	_, err := d.conn.Exec("DELETE FROM items WHERE id = ?", id)
	return err
}

func (d *DB) ClearCompleted() (int64, error) {
	res, err := d.conn.Exec("DELETE FROM items WHERE completed = 1")
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (d *DB) RecordAisleCorrection(itemName, prevAisle, correctedAisle, correctedBy, reason string) error {
	name := strings.TrimSpace(itemName)
	corrected := strings.TrimSpace(correctedAisle)
	if name == "" || corrected == "" {
		return nil
	}

	by := strings.TrimSpace(correctedBy)
	if by == "" {
		by = "user"
	}

	// 1. Insert in audit history
	query := `INSERT INTO aisle_corrections (item_name, previous_aisle, corrected_aisle, corrected_by, reason, created_at)
	          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
	_, err := d.conn.Exec(query, name, prevAisle, corrected, by, reason)
	if err != nil {
		return err
	}

	// 2. Persist learning permanently in aisle_learnings table
	return d.SaveAisleLearning(name, corrected)
}

func (d *DB) GetAisleCorrections(limit int) ([]models.AisleCorrection, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}

	query := `SELECT id, item_name, previous_aisle, corrected_aisle, corrected_by, reason, created_at
	          FROM aisle_corrections
	          ORDER BY created_at DESC
	          LIMIT ?`

	rows, err := d.conn.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.AisleCorrection
	for rows.Next() {
		var c models.AisleCorrection
		var createdStr string
		if err := rows.Scan(&c.ID, &c.ItemName, &c.PreviousAisle, &c.CorrectedAisle, &c.CorrectedBy, &c.Reason, &createdStr); err != nil {
			return nil, err
		}
		c.CreatedAt = parseTime(createdStr)
		list = append(list, c)
	}

	if list == nil {
		list = []models.AisleCorrection{}
	}
	return list, nil
}

func parseTime(raw string) time.Time {
	t, err := time.Parse("2006-01-02 15:04:05", raw)
	if err != nil {
		t, err = time.Parse(time.RFC3339, raw)
		if err != nil {
			return time.Now().UTC()
		}
	}
	return t
}

// DetectCategory provides automatic category classification based on common French grocery keywords.
func DetectCategory(name string) string {
	n := strings.ToLower(name)
	switch {
	case containsAny(n, "pomme", "poire", "banane", "tomate", "avocat", "salade", "oignon", "ail", "carotte", "courgette", "poivron", "citron", "fruit", "légume", "champignon", "patate", "pomme de terre"):
		return "Fruits & Légumes"
	case containsAny(n, "lait", "beurre", "creme", "crème", "yaourt", "fromage", "oeuf", "œuf", "emmental", "mozzarella", "parmesan"):
		return "Produits Frais"
	case containsAny(n, "poulet", "boeuf", "bœuf", "porc", "steak", "saumon", "thon", "poisson", "jambon", "viande", "bacon", "saucisse"):
		return "Boucherie & Poisson"
	case containsAny(n, "pain", "baguette", "croissant", "brioche", "pain de mie", "toast"):
		return "Boulangerie"
	case containsAny(n, "pâte", "pates", "riz", "farine", "sucre", "huile", "vinaigre", "sel", "poivre", "sauce", "chocolat", "biscuit", "cafe", "café", "the", "thé", "confiture", "cereale", "céréale"):
		return "Épicerie"
	case containsAny(n, "eau", "jus", "biere", "bière", "vin", "coca", "soda", "limonade", "sirop"):
		return "Boissons"
	case containsAny(n, "savon", "shampoing", "dentifrice", "papier toilette", "sopalin", "lessive", "eponge", "éponge", "sac poubelle"):
		return "Maison & Hygiène"
	default:
		return "Autre"
	}
}

func containsAny(s string, keywords ...string) bool {
	for _, k := range keywords {
		if strings.Contains(s, k) {
			return true
		}
	}
	return false
}
