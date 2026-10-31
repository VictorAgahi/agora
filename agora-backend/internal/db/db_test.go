package db_test

import (
	"os"
	"testing"

	"github.com/victoragahi/agora/agora-backend/internal/db"
	"github.com/victoragahi/agora/agora-backend/internal/models"
)

func TestDB_Operations(t *testing.T) {
	tmpFile := "test_agora.db"
	defer os.Remove(tmpFile)

	database, err := db.Open(tmpFile)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	defer database.Close()

	// 1. Add item
	item, err := database.AddItem(models.ItemInput{
		Name:     "Lait d'avoine",
		Quantity: "2L",
	})
	if err != nil {
		t.Fatalf("failed to add item: %v", err)
	}
	if item.Category != "Produits Frais" {
		t.Errorf("expected auto category 'Produits Frais', got '%s'", item.Category)
	}
	if item.Completed {
		t.Errorf("expected completed=false")
	}

	// 2. Add batch
	batch, err := database.AddItemsBatch([]models.ItemInput{
		{Name: "Pommes Gala", Quantity: "1kg"},
		{Name: "Pâtes Barilla", Quantity: "500g"},
	})
	if err != nil {
		t.Fatalf("failed to add batch: %v", err)
	}
	if len(batch) != 2 {
		t.Fatalf("expected 2 items, got %d", len(batch))
	}

	// 3. List
	items, err := database.ListItems(false)
	if err != nil {
		t.Fatalf("failed to list items: %v", err)
	}
	if len(items) != 3 {
		t.Fatalf("expected 3 items, got %d", len(items))
	}

	// 4. Toggle
	toggled, err := database.ToggleItem(item.ID)
	if err != nil {
		t.Fatalf("failed to toggle item: %v", err)
	}
	if !toggled.Completed {
		t.Errorf("expected completed=true after toggle")
	}

	// 5. Clear completed
	cleared, err := database.ClearCompleted()
	if err != nil {
		t.Fatalf("failed to clear completed: %v", err)
	}
	if cleared != 1 {
		t.Errorf("expected 1 cleared item, got %d", cleared)
	}
}
