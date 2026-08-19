package model

type User struct {
	ID      string `json:"id"`
	Name    string `json:"name,omitempty"`
	Email   string `json:"email"`
	Image   string `json:"image,omitempty"`
	IsAdmin bool   `json:"is_admin"`
}
