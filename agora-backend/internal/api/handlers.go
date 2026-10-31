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

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
