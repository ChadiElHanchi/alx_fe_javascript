// ---------------------
// Initialization
// ---------------------

let quotes = [];
const savedQuotes = localStorage.getItem("quotes");
if (savedQuotes) {
  quotes = JSON.parse(savedQuotes);
} else {
  quotes = [
    { id: 1, text: "The best way to predict the future is to invent it.", category: "Inspiration" },
    { id: 2, text: "Stay hungry, stay foolish.", category: "Inspiration" },
    { id: 3, text: "Life is what happens when you're busy making other plans.", category: "Life" },
    { id: 4, text: "Get busy living or get busy dying.", category: "Life" },
  ];
  saveQuotes();
}

const syncStatus = document.getElementById("syncStatus");
const quoteDisplay = document.getElementById("quoteDisplay");
const filteredQuotes = document.getElementById("filteredQuotes");
const newQuoteBtn = document.getElementById("newQuote");
const categorySelect = document.getElementById("categorySelect");
const categoryFilter = document.getElementById("categoryFilter");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");

let newQuoteText;
let newQuoteCategory;

// ---------------------
// Functions
// ---------------------

function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category))];

  categorySelect.innerHTML = "";
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  categoryFilter.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All Categories";
  categoryFilter.appendChild(allOption);

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  const savedFilter = localStorage.getItem("selectedFilter");
  if (savedFilter) {
    categoryFilter.value = savedFilter;
  }

  filterQuotes();
}

function showRandomQuote() {
  const selectedCategory = categorySelect.value;
  const filtered = quotes.filter(q => q.category === selectedCategory);
  if (filtered.length === 0) {
    quoteDisplay.textContent = "No quotes in this category.";
    return;
  }
  const randomIndex = Math.floor(Math.random() * filtered.length);
  const randomQuote = filtered[randomIndex].text;
  quoteDisplay.textContent = randomQuote;

  sessionStorage.setItem("lastQuote", randomQuote);
}

function createAddQuoteForm() {
  const container = document.getElementById("addQuoteContainer");

  const inputQuote = document.createElement("input");
  inputQuote.id = "newQuoteText";
  inputQuote.type = "text";
  inputQuote.placeholder = "Enter a new quote";

  const inputCategory = document.createElement("input");
  inputCategory.id = "newQuoteCategory";
  inputCategory.type = "text";
  inputCategory.placeholder = "Enter quote category";

  const button = document.createElement("button");
  button.textContent = "Add Quote";
  button.addEventListener("click", addQuote);

  container.appendChild(inputQuote);
  container.appendChild(document.createElement("br"));
  container.appendChild(inputCategory);
  container.appendChild(document.createElement("br"));
  container.appendChild(button);

  newQuoteText = inputQuote;
  newQuoteCategory = inputCategory;
}

function addQuote() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();

  if (!text || !category) {
    alert("Please enter both a quote and a category.");
    return;
  }

  // Assign new IDs >= 1000 to mark new quotes for syncing
  const maxId = quotes.length ? Math.max(...quotes.map(q => q.id)) : 999;
  const newId = maxId >= 1000 ? maxId + 1 : 1000;

  const newQuote = { id: newId, text, category };
  quotes.push(newQuote);
  saveQuotes();
  populateCategories();

  newQuoteText.value = "";
  newQuoteCategory.value = "";

  alert("Quote added!");
}

// ---------------------
// Sync all local new quotes & fetch server quotes
// ---------------------

async function syncQuotes() {
  try {
    // POST all new local quotes with id >= 1000
    const newQuotes = quotes.filter(q => q.id >= 1000);
    for (const quote of newQuotes) {
      await fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quote.text,
          body: quote.category,
          userId: 1
        }),
      });
    }

    // GET latest quotes from server
    const response = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
    const serverQuotes = await response.json();

    const serverMapped = serverQuotes.map(post => ({
      id: post.id,
      text: post.title,
      category: "Server"
    }));

    resolveConflicts(serverMapped);

    syncStatus.textContent = "Sync completed successfully.";
    syncStatus.style.color = "green";
    setTimeout(() => (syncStatus.textContent = ""), 3000);
  } catch (error) {
    console.error("Sync failed:", error);
    syncStatus.textContent = "Sync failed.";
    syncStatus.style.color = "red";
    setTimeout(() => (syncStatus.textContent = ""), 3000);
  }
}

function resolveConflicts(serverData) {
  let newItems = 0;
  serverData.forEach(serverQuote => {
    if (!quotes.find(localQuote => localQuote.id === serverQuote.id)) {
      quotes.push(serverQuote);
      newItems++;
    }
  });

  if (newItems > 0) {
    saveQuotes();
    populateCategories();
    syncStatus.textContent = `Server sync: Added ${newItems} new quotes.`;
    syncStatus.style.color = "green";
    setTimeout(() => (syncStatus.textContent = ""), 3000);
  }
}

function filterQuotes() {
  const selectedFilter = categoryFilter.value;
  localStorage.setItem("selectedFilter", selectedFilter);

  let toDisplay = quotes;
  if (selectedFilter !== "all") {
    toDisplay = quotes.filter(q => q.category === selectedFilter);
  }

  if (toDisplay.length === 0) {
    filteredQuotes.innerHTML = "<p>No quotes found for this category.</p>";
    return;
  }

  filteredQuotes.innerHTML = "<ul>" + toDisplay.map(q => `<li>${q.text}</li>`).join("") + "</ul>";
}

function exportQuotes() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();

  URL.revokeObjectURL(url);
}

function importFromJsonFile(event) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        imported.forEach(item => {
          if (!quotes.find(q => q.id === item.id)) {
            quotes.push(item);
          }
        });
        saveQuotes();
        populateCategories();
        alert("Quotes imported successfully!");
      } else {
        alert("Invalid JSON format.");
      }
    } catch {
      alert("Failed to parse JSON.");
    }
  };
  reader.readAsText(event.target.files[0]);
}

// ---------------------
// Events & Init
// ---------------------

newQuoteBtn.addEventListener("click", showRandomQuote);
exportBtn.addEventListener("click", exportQuotes);
importFile.addEventListener("change", importFromJsonFile);
categoryFilter.addEventListener("change", filterQuotes);

createAddQuoteForm();
populateCategories();

const lastQuote = sessionStorage.getItem("lastQuote");
if (lastQuote) {
  quoteDisplay.textContent = `Last viewed quote: "${lastQuote}"`;
}

// Sync every 15 seconds
setInterval(syncQuotes, 15000);
