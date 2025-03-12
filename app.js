const STORAGE_KEY = 'calories-app';
const API_KEY = 'TzS08MjwrkBvspQVkh5FKw==SeeWDtp85qqeJLZC'; // Replace with your API key
const API_ENDPOINT = 'https://api.calorieninjas.com/v1/nutrition';

const goalSetupDialog = document.getElementById('goalSetupDialog');
const totalDisplay = document.getElementById('total');
const goalDisplay = document.getElementById('goal');
const mealForm = document.getElementById('mealForm');
const mealIdInput = document.getElementById('mealIdInput');
const goalInput = document.getElementById('goalInput');
const mealInput = document.getElementById('mealInput');
const weightInput = document.getElementById('weightInput');
const caloriesInput = document.getElementById('caloriesInput');
const listItemTemplate = document.getElementById('listItemTemplate');
const mealsList = document.getElementById('mealsList');
const circularProgress = document.getElementById('circularProgress');
const circleFg = document.querySelector('#circularProgress .fg');
const persentsDisplay = document.getElementById('persents');
const datePicker = document.getElementById('datePicker');
const prevDayBtn = document.getElementById('prevDayBtn');
const nextDayBtn = document.getElementById('nextDayBtn');

let caloriesData = null;
let editingCalories = 0;
let selectedDate = new Date().toISOString().split('T')[0]; // Default: Today
let mealCalorieCache = {}; // Cache for meal calorie data

document.getElementById('goalForm').addEventListener('submit', handleGoalFormSubmit);
document.getElementById('editGoalBtn').addEventListener('click', handleEditGoalBtnClick);
mealForm.addEventListener('submit', handleMealFormSubmit);
mealsList.addEventListener('click', handleOnMealsListClick);
mealForm.querySelector('#deleteBtn').addEventListener('click', handleDeleteBtnClick);
mealForm.querySelector('#cancelBtn').addEventListener('click', resetMealForm);
document.getElementById('clearAllBtn').addEventListener('click', handleClearAllBtnClick);
datePicker.addEventListener('change', handleDateChange);
prevDayBtn.addEventListener('click', () => shiftDate(-1));
nextDayBtn.addEventListener('click', () => shiftDate(1));

init();

// Fetch calories when the meal is selected
mealInput.addEventListener('input', async () => {
    const mealName = mealInput.value.trim();
    if (mealName.length > 2) {
        const caloriesPer100g = await getMealCalories(mealName);
        if (caloriesPer100g !== null) {
            mealInput.dataset.caloriesPer100g = caloriesPer100g;
            updateCalories();
        }
    }
});

// Recalculate calories when weight changes
weightInput.addEventListener('input', updateCalories);

// Get meal calories (with caching)
async function getMealCalories(meal) {
    // Check if the meal data is already cached
    if (mealCalorieCache[meal]) {
        return mealCalorieCache[meal];
    }

    // Fetch from API if not cached
    const caloriesPer100g = await fetchMealCalories(meal);
    if (caloriesPer100g !== null) {
        mealCalorieCache[meal] = caloriesPer100g; // Cache the result
    }
    return caloriesPer100g;
}

// Fetch meal calories from API
async function fetchMealCalories(meal) {
    try {
        const response = await fetch(`${API_ENDPOINT}?query=${meal}`, {
            headers: { 'X-Api-Key': API_KEY }
        });
        const data = await response.json();
        if (data.items.length > 0) {
            return data.items[0].calories;
        }
    } catch (error) {
        console.error('Error fetching meal data:', error);
    }
    return null;
}

// Calculate calories based on weight and meal data
function updateCalories() {
    const caloriesPer100g = parseFloat(mealInput.dataset.caloriesPer100g || 0);
    const weight = parseFloat(weightInput.value || 0);
    const calculatedCalories = (caloriesPer100g * weight) / 100;
    caloriesInput.value = Math.round(calculatedCalories); // Round to integer
}

function init() {
    datePicker.value = selectedDate;
    let data = localStorage.getItem(STORAGE_KEY) || '';

    if (data) {
        caloriesData = JSON.parse(data);
        if (!caloriesData.mealsByDate) caloriesData.mealsByDate = {}; // Ensure structure exists

        goalDisplay.textContent = caloriesData.goal;
        updateMealsForSelectedDate();
    } else {
        caloriesData = {
            goal: 0,
            mealsByDate: {}
        };
        goalSetupDialog.classList.add('active');
    }

    highlightMealDates();
}

function handleGoalFormSubmit(e) {
    e.preventDefault();
    goalSetupDialog.classList.remove('active');

    caloriesData.goal = +goalInput.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(caloriesData));

    goalDisplay.textContent = caloriesData.goal;
    updateCircularProgressBar();
}

function handleMealFormSubmit(e) {
    e.preventDefault();
    const currentMeals = caloriesData.mealsByDate[selectedDate] || { total: 0, meals: [] };

    if (mealForm.dataset.mode === 'add') {
        const newMeal = {
            id: new Date().valueOf(),
            meal: mealInput.value.trim(),
            weight: +weightInput.value,
            calories: Math.round(+caloriesInput.value) // Round calories to integer
        };

        currentMeals.total += newMeal.calories;
        currentMeals.meals.push({ ...newMeal });

    } else if (mealForm.dataset.mode === 'edit') {
        const editedMeal = {
            id: mealIdInput.value,
            meal: mealInput.value.trim(),
            weight: +weightInput.value,
            calories: Math.round(+caloriesInput.value) // Round calories to integer
        };

        let index = currentMeals.meals.findIndex(meal => meal.id == mealIdInput.value);
        const diff = editedMeal.calories - editingCalories;
        currentMeals.total += diff;
        editingCalories = 0;

        currentMeals.meals[index] = { ...editedMeal };
        mealForm.dataset.mode = 'add';
    }

    caloriesData.mealsByDate[selectedDate] = currentMeals;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(caloriesData));

    updateMealsForSelectedDate();
    mealForm.reset();
    highlightMealDates();
}

function updateMealsForSelectedDate() {
    mealsList.innerHTML = '';

    const currentMeals = caloriesData.mealsByDate[selectedDate] || { total: 0, meals: [] };
    totalDisplay.textContent = currentMeals.total;

    currentMeals.meals.forEach(meal => renderListItem(meal));
    updateCircularProgressBar();
}

function renderListItem(item) {
    const clone = listItemTemplate.content.cloneNode(true);
    clone.querySelector('li').dataset.itemId = item.id;
    clone.querySelector('.meal-display').textContent = `${item.meal} (${item.weight}g)`;
    clone.querySelector('.calories-display').textContent = item.calories;
    mealsList.appendChild(clone);
}

function handleOnMealsListClick(e) {
    if (e.target.classList.contains('edit-meal-btn')) {
        const currElementId = e.target.closest('.list-item').dataset.itemId;
        const currentMeals = caloriesData.mealsByDate[selectedDate] || { meals: [] };
        const currItem = currentMeals.meals.find(meal => meal.id == currElementId);

        mealIdInput.value = currItem.id;
        mealInput.value = currItem.meal;
        weightInput.value = currItem.weight;
        caloriesInput.value = currItem.calories;
        editingCalories = currItem.calories;

        mealForm.dataset.mode = 'edit';
    }
}

function handleDeleteBtnClick() {
    let currentMeals = caloriesData.mealsByDate[selectedDate] || { meals: [], total: 0 };
    let index = currentMeals.meals.findIndex(meal => meal.id == mealIdInput.value);

    if (index > -1) {
        currentMeals.total -= +currentMeals.meals[index].calories;
        currentMeals.meals.splice(index, 1);
        caloriesData.mealsByDate[selectedDate] = currentMeals;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(caloriesData));
        updateMealsForSelectedDate();
        highlightMealDates();
    }
}

function handleClearAllBtnClick() {
    caloriesData.mealsByDate[selectedDate] = { total: 0, meals: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(caloriesData));

    updateMealsForSelectedDate();
    highlightMealDates();
    if (mealForm.dataset.mode === 'edit') resetMealForm();
}

function handleEditGoalBtnClick() {
    goalInput.value = caloriesData.goal;
    goalSetupDialog.classList.add('active');
}

function resetMealForm() {
    mealForm.reset();
    mealForm.dataset.mode = 'add';
}

function handleDateChange() {
    selectedDate = datePicker.value;
    updateMealsForSelectedDate();
}

function shiftDate(days) {
    let current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    selectedDate = current.toISOString().split('T')[0];
    datePicker.value = selectedDate;
    updateMealsForSelectedDate();
}

// Highlight Dates in the Calendar that Have Meals
function highlightMealDates() {
    let allDates = Object.keys(caloriesData.mealsByDate || {});

    let css = "";
    allDates.forEach(date => {
        css += `input[type="date"]::before[value="${date}"] { 
            background: #00ff00 !important; /* Green Box */
            border-radius: 50%; 
            padding: 2px;
        }`;
    });

    let styleTag = document.getElementById("mealDatesStyles");
    if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "mealDatesStyles";
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = css;
}

function updateCircularProgressBar() {
    const currentMeals = caloriesData.mealsByDate[selectedDate] || { total: 0 };
    let percentage = (caloriesData.goal === 0) ? 0 : Math.round((+currentMeals.total / +caloriesData.goal) * 100);
    
    circleFg.style.opacity = (currentMeals.total === 0) ? '0' : '1';
    circleFg.style.stroke = percentage > 100 ? '#ea3642' : '#5394fd';

    circularProgress.style.setProperty('--progress', percentage);
    persentsDisplay.textContent = `${percentage} %`;

    // Update the calorie display with integer values
    totalDisplay.textContent = Math.round(currentMeals.total); // Round total calories
    goalDisplay.textContent = Math.round(caloriesData.goal); // Round goal calories
}
document.addEventListener("DOMContentLoaded", function () {
    // Function to get saved dates from `caloriesData`
    function getSavedDates() {
        let savedDates = [];
        let storedData = localStorage.getItem("caloriesData"); // Get stored data
        
        if (storedData) {
            let parsedData = JSON.parse(storedData); // Parse JSON
            let mealsByDate = parsedData.mealsByDate || {}; // Extract mealsByDate

            // Get dates that have saved meals
            savedDates = Object.keys(mealsByDate).filter(date => mealsByDate[date].meals && mealsByDate[date].meals.length > 0);
        }
        return savedDates;
    }

    // Fetch saved dates dynamically
    let savedDates = getSavedDates();

    // Initialize Flatpickr with dynamic date highlighting
    flatpickr("#datePicker", {
        dateFormat: "d/m/Y",
        defaultDate: new Date(),
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            let formattedDate = dayElem.dateObj.toISOString().split("T")[0]; // Format as YYYY-MM-DD

            // Convert all stored dates to consistent format for comparison
            let formattedSavedDates = savedDates.map(date => {
                let parts = date.split("/");
                return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : date;
            });

            if (formattedSavedDates.includes(formattedDate)) {
                dayElem.style.background = "green";
                dayElem.style.color = "white";
                dayElem.style.borderRadius = "50%";
            }
        }
    });
});
