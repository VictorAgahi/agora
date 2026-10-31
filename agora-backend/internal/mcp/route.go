package mcp

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/victoragahi/agora/agora-backend/internal/models"
)

type AisleInfo struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Location string   `json:"location"`
	Rank     int      `json:"rank"`
	Keywords []string `json:"-"`
}

var StoreAisles = []AisleInfo{
	{
		ID:       "promo",
		Name:     "Zone Promo",
		Location: "Entrée face aux fruits",
		Rank:     5,
		Keywords: []string{"promo", "promotion", "catalogue"},
	},
	{
		ID:       "fruits-legumes",
		Name:     "Fruits & Légumes",
		Location: "Entrée sur la gauche",
		Rank:     10,
		Keywords: []string{
			"pomme", "poire", "banane", "tomate", "avocat", "salade", "oignon", "ail",
			"carotte", "courgette", "poivron", "citron", "fruit", "legume", "légume",
			"champignon", "patate", "pomme de terre", "fraise", "framboise", "melon",
			"pasteque", "pastèque", "orange", "mandarine", "clementine", "raisin",
			"peche", "pêche", "abricot", "kiwi", "mangue", "concombre", "epinard",
			"échalote", "echalote", "poireau", "brocoli", "chou", "persil", "basilic",
		},
	},
	{
		ID:       "noix-cajou",
		Name:     "Noix de cajou & Fruits secs",
		Location: "Îlot devant les fruits & légumes",
		Rank:     15,
		Keywords: []string{"cajou", "amande", "pistache", "noisette", "noix", "fruit sec", "raisin sec", "cacahuete", "cacahuète", "graines"},
	},
	{
		ID:       "boulangerie-fraiche",
		Name:     "Pain & Boulangerie",
		Location: "Entrée sur la droite",
		Rank:     20,
		Keywords: []string{"baguette", "pain artisanal", "croissant", "pain au chocolat", "chocolatine", "brioche", "chausson", "tourte", "boule de pain"},
	},
	{
		ID:       "chips-apero",
		Name:     "Chips, Apéro & Boissons",
		Location: "Allée de droite (début)",
		Rank:     30,
		Keywords: []string{"chips", "pringles", "apero", "apéro", "doritos", "bretzel", "tortillas", "biere", "bière", "vin", "coca", "soda", "fanta", "jus", "eau"},
	},
	{
		ID:       "cuisine-monde",
		Name:     "Cuisine du monde (Mexicain, Asiatique...)",
		Location: "Allée de droite (2ème rayon)",
		Rank:     40,
		Keywords: []string{"mexicain", "asiatique", "tacos", "fajitas", "sauce soja", "nouilles", "ramen", "curry", "coco", "wasabi", "nem", "sushi", "riz basmati"},
	},
	{
		ID:       "epicerie-conserves",
		Name:     "Épicerie (Pâtes, Sauces) & Conserves",
		Location: "Allée de droite (milieu)",
		Rank:     50,
		Keywords: []string{
			"pate", "pâtes", "pates", "spaghetti", "coquillettes", "penne", "sauce tomate",
			"pesto", "bolognaise", "conserve", "thon", "mais", "maïs", "haricot", "lentilles",
			"pois chiche", "concentre", "sardines", "ratatouille",
		},
	},
	{
		ID:       "farine-sucre",
		Name:     "Farine, Sucre, Huiles & Épices",
		Location: "Allée de droite (milieu-haut)",
		Rank:     60,
		Keywords: []string{"farine", "sucre", "levure", "huile", "vinaigre", "sel", "poivre", "epice", "épice", "chocolat noir", "vanille"},
	},
	{
		ID:       "bio-oeufs",
		Name:     "Bio & Œufs",
		Location: "Allée de droite (haut)",
		Rank:     70,
		Keywords: []string{"oeuf", "oeufs", "œuf", "œufs", "bio", "galette riz", "tofu", "quinoa", "lait d avoine", "lait de soja"},
	},
	{
		ID:       "pain-sec",
		Name:     "Pain de mie & Biscottes",
		Location: "Allée de droite (haut)",
		Rank:     80,
		Keywords: []string{"pain de mie", "biscottes", "cracotte", "toast", "muffin", "pain burger", "wasa"},
	},
	{
		ID:       "cereales-cafe",
		Name:     "Céréales, Café, Thé & Petit Déjeuner",
		Location: "Allée de droite (avant-fond)",
		Rank:     90,
		Keywords: []string{"cereale", "céréales", "muesli", "granola", "cafe", "café", "the", "thé", "infusion", "confiture", "miel", "nutella", "chocolat chaud"},
	},
	{
		ID:       "hygiene",
		Name:     "Papier, Dentifrice, Entretien & Vaisselle",
		Location: "Fond du magasin à droite",
		Rank:     100,
		Keywords: []string{
			"papier toilette", "dentifrice", "vaisselle", "sopalin", "essuie-tout", "lessive",
			"liquide vaisselle", "shampoing", "savon", "gel douche", "eponge", "éponge",
			"sac poubelle", "javel", "nettoyant", "deodorant",
		},
	},
	{
		ID:       "fromages-frais",
		Name:     "Fromages Frais",
		Location: "Fond du magasin à gauche",
		Rank:     110,
		Keywords: []string{"fromage", "camembert", "comte", "comté", "chevre", "chèvre", "emmental", "parmesan", "mozzarella", "roquefort", "brie", "feta", "râpé"},
	},
	{
		ID:       "creme-liquide",
		Name:     "Crème fraîche liquide & Béchamel",
		Location: "Allée centrale (haut)",
		Rank:     120,
		Keywords: []string{"creme liquide", "crème liquide", "bechamel", "béchamel", "fleurette"},
	},
	{
		ID:       "pates-fraiches",
		Name:     "Pâtes fraîches & Pâtes brisées",
		Location: "Allée centrale (droite haut)",
		Rank:     130,
		Keywords: []string{"pates fraiches", "pâtes fraîches", "ravioli", "gnocchi", "pate brisee", "pâte brisée", "pate feuilletee", "pate a pizza"},
	},
	{
		ID:       "viandes-rouge",
		Name:     "Viandes rouges & Boucherie",
		Location: "Allée centrale (gauche haut)",
		Rank:     140,
		Keywords: []string{"boeuf", "bœuf", "steak", "hache", "haché", "veau", "porc", "agneau", "bavette"},
	},
	{
		ID:       "volailles",
		Name:     "Volailles (Poulet, Dinde)",
		Location: "Allée centrale (gauche milieu)",
		Rank:     150,
		Keywords: []string{"poulet", "dinde", "canard", "escalope", "blanc de poulet", "cuisse de poulet"},
	},
	{
		ID:       "creme-solide",
		Name:     "Crème fraîche solide en pot",
		Location: "Allée centrale (gauche bas)",
		Rank:     160,
		Keywords: []string{"creme fraiche", "crème fraîche", "creme epaisse", "crème épaisse", "creme pot"},
	},
	{
		ID:       "sandwich",
		Name:     "Sandwichs & Snacking traiteur",
		Location: "Allée centrale (gauche bas)",
		Rank:     170,
		Keywords: []string{"sandwich", "wrap", "snacking", "salade preparee"},
	},
	{
		ID:       "jambon-lardons",
		Name:     "Frais, Jambon, Lardons & Saucisses",
		Location: "Allée centrale (droite bas)",
		Rank:     180,
		Keywords: []string{"jambon", "lardon", "lardons", "bacon", "saucisse", "knacki"},
	},
	{
		ID:       "charcuterie-traiteur",
		Name:     "Charcuterie, Traiteur & Plats cuisinés",
		Location: "Îlot central gauche",
		Rank:     190,
		Keywords: []string{"traiteur", "plat cuisine", "quiche", "saucisson", "jambon sec", "rillettes", "saumon", "poisson", "crevettes"},
	},
	{
		ID:       "yaourts",
		Name:     "Frais & Yaourts (Grand mur)",
		Location: "Grand mur frais sur toute la gauche",
		Rank:     200,
		Keywords: []string{
			"yaourt", "yaourts", "yaourt nature", "yaourt grec", "fromage blanc",
			"petits suisses", "beurre", "lait", "creme dessert", "danette", "compote",
		},
	},
	{
		ID:       "surgeles",
		Name:     "Congélateur (Surgelés & Glaces)",
		Location: "Bac central en haut (À PRENDRE EN DERNIER - Chaîne du froid)",
		Rank:     250,
		Keywords: []string{"surgele", "surgelé", "surgeles", "surgelés", "glace", "glaces", "frites", "pizza surgelee", "congelo", "picard"},
	},
}

func DetectAisleForItem(item models.Item) AisleInfo {
	nameLower := strings.ToLower(item.Name)

	// 1. Frozen / Surgelés priority check (e.g., "glace vanille", "pizza surgelée")
	frozenAisle := getAisleByID("surgeles")
	for _, kw := range frozenAisle.Keywords {
		if strings.Contains(nameLower, kw) {
			return frozenAisle
		}
	}

	// 2. Specific keyword match across store aisles
	for _, a := range StoreAisles {
		if a.ID == "surgeles" {
			continue
		}
		for _, kw := range a.Keywords {
			if strings.Contains(nameLower, kw) {
				return a
			}
		}
	}

	// Category fallback
	cat := item.Category
	switch cat {
	case "Fruits & Légumes":
		return getAisleByID("fruits-legumes")
	case "Boulangerie":
		return getAisleByID("boulangerie-fraiche")
	case "Maison & Hygiène":
		return getAisleByID("hygiene")
	case "Boissons":
		return getAisleByID("chips-apero")
	case "Boucherie & Poisson":
		return getAisleByID("viandes-rouge")
	case "Produits Frais":
		return getAisleByID("yaourts")
	default:
		return getAisleByID("epicerie-conserves")
	}
}

func getAisleByID(id string) AisleInfo {
	for _, a := range StoreAisles {
		if a.ID == id {
			return a
		}
	}
	return StoreAisles[6] // epicerie-conserves
}

type RouteStep struct {
	StepNumber int           `json:"step_number"`
	Aisle      AisleInfo     `json:"aisle"`
	Items      []models.Item `json:"items"`
	ItemCount  int           `json:"item_count"`
	ColdChain  bool          `json:"cold_chain_warning,omitempty"`
}

type OptimizedShoppingRoute struct {
	TotalSteps int         `json:"total_steps"`
	TotalItems int         `json:"total_items"`
	Steps      []RouteStep `json:"steps"`
}

func BuildOptimizedRoute(items []models.Item) OptimizedShoppingRoute {
	aisleGroups := make(map[string][]models.Item)
	for _, it := range items {
		aisle := DetectAisleForItem(it)
		aisleGroups[aisle.ID] = append(aisleGroups[aisle.ID], it)
	}

	var activeAisles []AisleInfo
	for _, a := range StoreAisles {
		if len(aisleGroups[a.ID]) > 0 {
			activeAisles = append(activeAisles, a)
		}
	}

	sort.Slice(activeAisles, func(i, j int) bool {
		return activeAisles[i].Rank < activeAisles[j].Rank
	})

	var steps []RouteStep
	totalItemsCount := 0
	for i, aisle := range activeAisles {
		groupItems := aisleGroups[aisle.ID]
		totalItemsCount += len(groupItems)
		steps = append(steps, RouteStep{
			StepNumber: i + 1,
			Aisle:      aisle,
			Items:      groupItems,
			ItemCount:  len(groupItems),
			ColdChain:  aisle.ID == "surgeles",
		})
	}

	return OptimizedShoppingRoute{
		TotalSteps: len(steps),
		TotalItems: totalItemsCount,
		Steps:      steps,
	}
}

func (r *OptimizedShoppingRoute) ToFormattedText() string {
	if r.TotalSteps == 0 {
		return "🛒 Aucun article à acheter sur la liste de courses. Parcours vide."
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("🛒 PARCOURS DE COURSES OPTIMISÉ AGORA (%d étapes, %d articles) :\n", r.TotalSteps, r.TotalItems))
	sb.WriteString("🚩 Départ : Entrée principale du magasin\n\n")

	for _, step := range r.Steps {
		coldWarning := ""
		if step.ColdChain {
			coldWarning = " ❄️ [ATTENTION : Chaîne du froid - Prélever en dernier avant les caisses !]"
		}
		sb.WriteString(fmt.Sprintf("📍 [Étape %d/%d] %s%s\n", step.StepNumber, r.TotalSteps, step.Aisle.Name, coldWarning))
		sb.WriteString(fmt.Sprintf("   Emplacement : %s\n", step.Aisle.Location))
		for _, it := range step.Items {
			status := "[ ]"
			if it.Completed {
				status = "[x]"
			}
			qty := ""
			if it.Quantity != "" {
				qty = fmt.Sprintf(" (%s)", it.Quantity)
			}
			notes := ""
			if it.Notes != "" {
				notes = fmt.Sprintf(" - Note: %s", it.Notes)
			}
			sb.WriteString(fmt.Sprintf("   • %s ID:%d | %s%s%s\n", status, it.ID, it.Name, qty, notes))
		}
		sb.WriteString("\n")
	}

	sb.WriteString("🏁 Arrivée : Passer en Caisses & Sortie\n\n")
	sb.WriteString("--- JSON DATA ---\n")
	rawJSON, _ := json.MarshalIndent(r, "", "  ")
	sb.WriteString(string(rawJSON))

	return sb.String()
}
