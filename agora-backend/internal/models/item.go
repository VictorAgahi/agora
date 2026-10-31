package models

import "time"

// Item represents a shopping list item.
type Item struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Quantity  string    `json:"quantity,omitempty"`
	Category  string    `json:"category,omitempty"`
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
	Notes    string `json:"notes,omitempty"`
}

// UpdateItemInput represents partial updates to an item.
type UpdateItemInput struct {
	Name      *string `json:"name,omitempty"`
	Quantity  *string `json:"quantity,omitempty"`
	Category  *string `json:"category,omitempty"`
	Notes     *string `json:"notes,omitempty"`
	Completed *bool   `json:"completed,omitempty"`
}
