package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

type SSEHub struct {
	mu      sync.RWMutex
	clients map[chan []byte]bool
}

func NewSSEHub() *SSEHub {
	return &SSEHub{
		clients: make(map[chan []byte]bool),
	}
}

func (h *SSEHub) Subscribe() chan []byte {
	h.mu.Lock()
	defer h.mu.Unlock()
	ch := make(chan []byte, 16)
	h.clients[ch] = true
	return ch
}

func (h *SSEHub) Unsubscribe(ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[ch]; ok {
		delete(h.clients, ch)
		close(ch)
	}
}

func (h *SSEHub) Broadcast(eventType string, data any) {
	payload, err := json.Marshal(map[string]any{
		"event": eventType,
		"data":  data,
	})
	if err != nil {
		return
	}

	msg := []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", eventType, string(payload)))

	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.clients {
		select {
		case ch <- msg:
		default:
			// client channel full, skip to prevent blocking
		}
	}
}

func (h *SSEHub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	clientChan := h.Subscribe()
	defer h.Unsubscribe(clientChan)

	// Send initial ping event
	fmt.Fprintf(w, "event: connected\ndata: {\"status\":\"connected\"}\n\n")
	flusher.Flush()

	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			return
		case msg, ok := <-clientChan:
			if !ok {
				return
			}
			w.Write(msg)
			flusher.Flush()
		}
	}
}
