package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/victoragahi/agora/agora-backend/internal/db"
	"github.com/victoragahi/agora/agora-backend/internal/models"
)

type API struct {
	database *db.DB
	hub      *SSEHub
}

func NewAPI(database *db.DB, hub *SSEHub) *API {
	return &API{
		database: database,
		hub:      hub,
	}
}

func (a *API) HandleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "healthy",
		"service": "agora-backend",
	})
}

func (a *API) HandleListItems(w http.ResponseWriter, r *http.Request) {
	includeCompleted := r.URL.Query().Get("include_completed") == "true"
	items, err := a.database.ListItems(includeCompleted)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list items")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) HandleAddItem(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	var input models.ItemInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	if input.Name == "" {
		writeError(w, http.StatusBadRequest, "item name is required")
		return
	}

	item, err := a.database.AddItem(input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add item")
		return
	}

	// Notify connected frontend clients
	a.hub.Broadcast("item_added", item)

	writeJSON(w, http.StatusCreated, item)
}

func (a *API) HandleToggleItem(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid item id")
		return
	}

	item, err := a.database.ToggleItem(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to toggle item")
		return
	}
	if item == nil {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	a.hub.Broadcast("item_updated", item)
	writeJSON(w, http.StatusOK, item)
}

func (a *API) HandleUpdateItem(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid item id")
		return
	}

	var input models.UpdateItemInput
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	item, err := a.database.UpdateItem(id, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update item")
		return
	}
	if item == nil {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	a.hub.Broadcast("item_updated", item)
	writeJSON(w, http.StatusOK, item)
}

func (a *API) HandleDeleteItem(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid item id")
		return
	}

	if err := a.database.DeleteItem(id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete item")
		return
	}

	a.hub.Broadcast("item_deleted", map[string]int64{"id": id})
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "id": id})
}

func (a *API) HandleClearCompleted(w http.ResponseWriter, r *http.Request) {
	count, err := a.database.ClearCompleted()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to clear completed items")
		return
	}

	a.hub.Broadcast("items_cleared", map[string]int64{"cleared_count": count})
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "cleared_count": count})
}

type AisleLearningInput struct {
	Keyword        string `json:"keyword"`
	ItemName       string `json:"item_name,omitempty"`
	AisleID        string `json:"aisle_id"`
	PreviousAisle  string `json:"previous_aisle,omitempty"`
	CorrectedAisle string `json:"corrected_aisle,omitempty"`
	Source         string `json:"source,omitempty"` // "user" or "hermes"
	Reason         string `json:"reason,omitempty"`
}

func (a *API) HandleSaveAisleLearning(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 16*1024)
	var input AisleLearningInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	name := input.ItemName
	if name == "" {
		name = input.Keyword
	}
	targetAisle := input.CorrectedAisle
	if targetAisle == "" {
		targetAisle = input.AisleID
	}

	if name == "" || targetAisle == "" {
		writeError(w, http.StatusBadRequest, "item_name (or keyword) and aisle_id are required")
		return
	}

	source := input.Source
	if source == "" {
		source = "user"
	}

	if err := a.database.RecordAisleCorrection(name, input.PreviousAisle, targetAisle, source, input.Reason); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to record aisle correction")
		return
	}

	a.hub.Broadcast("aisle_learned", map[string]any{
		"item_name":       name,
		"previous_aisle":  input.PreviousAisle,
		"corrected_aisle": targetAisle,
		"source":          source,
		"reason":          input.Reason,
	})

	writeJSON(w, http.StatusOK, map[string]any{
		"success":         true,
		"item_name":       name,
		"corrected_aisle": targetAisle,
		"source":          source,
	})
}

func (a *API) HandleGetAisleLearnings(w http.ResponseWriter, r *http.Request) {
	learnings, err := a.database.GetAisleLearnings()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch aisle learnings")
		return
	}
	writeJSON(w, http.StatusOK, learnings)
}

func (a *API) HandleGetAisleCorrections(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 30
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	corrections, err := a.database.GetAisleCorrections(limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch aisle corrections")
		return
	}
	writeJSON(w, http.StatusOK, corrections)
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
