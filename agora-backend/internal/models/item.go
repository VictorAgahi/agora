package models

import "time"

// Item represents a shopping list item.
type Item struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Quantity  string    `json:"quantity,omitempty"`
	Category  string    `json:"category,omitempty"`
	AisleID   string    `json:"aisle_id,omitempty"`
	Notes     string    `json:"notes,omitempty"`
	Completed bool      `json:"completed"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ItemInput is used for creating or updating items.
type ItemInput struct {
	Name     string `json:"name"`
	Quantity string `json:"quantity,omitempty"`
	Category string `json:"category,omitempty"`
	AisleID  string `json:"aisle_id,omitempty"`
	Notes    string `json:"notes,omitempty"`
}

// UpdateItemInput represents partial updates to an item.
type UpdateItemInput struct {
	Name      *string `json:"name,omitempty"`
	Quantity  *string `json:"quantity,omitempty"`
	Category  *string `json:"category,omitempty"`
	AisleID   *string `json:"aisle_id,omitempty"`
	Notes     *string `json:"notes,omitempty"`
	Completed *bool   `json:"completed,omitempty"`
}

// AisleCorrection represents a recorded aisle adjustment for self-improving AI learning.
type AisleCorrection struct {
	ID             int64     `json:"id"`
	ItemName       string    `json:"item_name"`
	PreviousAisle  string    `json:"previous_aisle"`
	CorrectedAisle string    `json:"corrected_aisle"`
	CorrectedBy    string    `json:"corrected_by"` // "user" or "hermes"
	Reason         string    `json:"reason,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}
