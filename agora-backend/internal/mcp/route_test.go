package mcp_test

import (
	"strings"
	"testing"

	"github.com/victoragahi/agora/agora-backend/internal/mcp"
	"github.com/victoragahi/agora/agora-backend/internal/models"
)

func TestBuildOptimizedRoute_OrderAndColdChain(t *testing.T) {
	testItems := []models.Item{
		{ID: 1, Name: "Glace Häagen-Dazs Vanille", Category: "Produits Frais"}, // Surgelés (must be last)
		{ID: 2, Name: "Baguette tradition", Category: "Boulangerie"},
		{ID: 3, Name: "Pommes Golden 1kg", Category: "Fruits & Légumes"},
		{ID: 4, Name: "Paquet de Pâtes Barilla 500g", Category: "Épicerie"},
		{ID: 5, Name: "Lessive liquide", Category: "Maison & Hygiène"},
	}

	route := mcp.BuildOptimizedRoute(testItems)

	if route.TotalSteps != 5 {
		t.Fatalf("expected 5 distinct aisle steps, got %d", route.TotalSteps)
	}

	// Step 1 must be Fruits & Légumes
	if route.Steps[0].Aisle.ID != "fruits-legumes" {
		t.Errorf("expected step 1 to be 'fruits-legumes', got '%s'", route.Steps[0].Aisle.ID)
	}

	// Step 2 must be Boulangerie
	if route.Steps[1].Aisle.ID != "boulangerie-fraiche" {
		t.Errorf("expected step 2 to be 'boulangerie-fraiche', got '%s'", route.Steps[1].Aisle.ID)
	}

	// Step 3 must be Épicerie
	if route.Steps[2].Aisle.ID != "epicerie-conserves" {
		t.Errorf("expected step 3 to be 'epicerie-conserves', got '%s'", route.Steps[2].Aisle.ID)
	}

	// Step 4 must be Hygiène
	if route.Steps[3].Aisle.ID != "hygiene" {
		t.Errorf("expected step 4 to be 'hygiene', got '%s'", route.Steps[3].Aisle.ID)
	}

	// Step 5 (LAST) must be Surgelés to protect cold chain!
	lastStep := route.Steps[4]
	if lastStep.Aisle.ID != "surgeles" {
		t.Errorf("expected last step to be 'surgeles', got '%s'", lastStep.Aisle.ID)
	}
	if !lastStep.ColdChain {
		t.Errorf("expected cold chain warning to be true for surgeles")
	}

	formatted := route.ToFormattedText()
	if !strings.Contains(formatted, "Chaîne du froid") {
		t.Errorf("expected formatted text to include cold chain warning")
	}
	if !strings.Contains(formatted, "Pommes Golden") {
		t.Errorf("expected formatted text to include item names")
	}
}

func TestBuildOptimizedRoute_ExplicitAisleIDOverride(t *testing.T) {
	// An item that by default would match "epicerie-conserves" but has been learned / assigned to "creme-liquide"
	testItems := []models.Item{
		{ID: 10, Name: "Sauce Béchamel Maison", Category: "Épicerie", AisleID: "creme-liquide"},
	}

	route := mcp.BuildOptimizedRoute(testItems)
	if route.TotalSteps != 1 {
		t.Fatalf("expected 1 step, got %d", route.TotalSteps)
	}
	if route.Steps[0].Aisle.ID != "creme-liquide" {
		t.Errorf("expected aisle to be 'creme-liquide', got '%s'", route.Steps[0].Aisle.ID)
	}
}

