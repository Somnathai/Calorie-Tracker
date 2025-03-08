const STORAGE_KEY = 'calories-app';

const goalSetupDialog = document.getElementById('goalSetupDialog');
const totalDisplay = document.getElementById('total');
const goalDisplay = document.getElementById('goal');
const mealForm = document.getElementById('mealForm');
const mealIdInput = document.getElementById('mealIdInput');
const goalInput = document.getElementById('goalInput');
const mealInput = document.getElementById('mealInput');
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
            calories: +caloriesInput.value
        };

        currentMeals.total += newMeal.calories;
        currentMeals.meals.push({ ...newMeal });

    } else if (mealForm.dataset.mode === 'edit') {
        const editedMeal = {
            id: mealIdInput.value,
            meal: mealInput.value.trim(),
            calories: +caloriesInput.value
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
    clone.querySelector('.meal-display').textContent = item.meal;
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

// ✅ Highlight Dates in the Calendar that Have Meals
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


