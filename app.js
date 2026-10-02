const toast = document.querySelector('.toast');
let toastTimer;

async function apiRequest(endpoint, options) {
  const response = await fetch(endpoint, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

document.querySelector('#startWorkout').addEventListener('click', () => {
  notify('Workout library opened — choose a session to begin.');
  document.querySelector('#workouts').scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('#viewProgress').addEventListener('click', () => {
  notify('You are 78% toward your weekly activity goal.');
});

document.querySelector('#logout').addEventListener('click', async () => {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  } catch (error) {
    notify(error.message);
  }
});

const profileForm = document.querySelector('#profileForm');
const profileSaveStatus = document.querySelector('.profile-save-status');

function updateProfileDisplay(profile) {
  const firstName = profile.name.trim().split(/\s+/)[0];
  const greeting = document.querySelector('.welcome h1');
  greeting.textContent = `Good morning, ${firstName} `;
  const wave = document.createElement('span');
  wave.textContent = '👋';
  greeting.append(wave);
  document.querySelectorAll('.avatar').forEach((avatar) => {
    avatar.textContent = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  });
  document.querySelector('.profile-mini strong').textContent = profile.name;
  const coachGreeting = document.querySelector('.chat-welcome h4');
  if (coachGreeting) coachGreeting.textContent = `Hi ${firstName}, I'm your fitness coach.`;
}

function startWorkoutSession(workoutId, workoutTitle) {
  apiRequest(`/api/workouts/${workoutId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: workoutTitle || '' })
  }).then((result) => notify(result.message)).catch((error) => notify(error.message));
}

function renderPersonalizedPlan(plan) {
  const status = document.querySelector('#planStatus');
  const intro = document.querySelector('#planIntro');
  const facts = document.querySelector('#planProfileFacts');
  const notice = document.querySelector('#planNotice');
  const levels = document.querySelector('#planLevels');
  const week = document.querySelector('#planWeek');
  const ageNote = document.querySelector('#planAgeNote');
  const disclaimer = document.querySelector('#planDisclaimer');
  const generateButton = document.querySelector('#generateAiPlan');

  status.textContent = plan.ready
    ? plan.aiGenerated ? 'Gemini AI plan' : plan.title
    : 'Profile needed';
  intro.textContent = plan.ready
    ? plan.summary
    : `Add ${plan.missingDetails.join(', ')} to your profile to create a plan around your details.`;
  generateButton.disabled = !plan.ready;
  generateButton.textContent = plan.aiGenerated ? '↻ Regenerate plan' : '✧ Generate with Gemini';
  facts.replaceChildren();
  levels.replaceChildren();
  week.replaceChildren();
  notice.hidden = plan.ready;
  notice.textContent = plan.ready ? '' : 'Complete the personal details form above, then save your profile to unlock your weekly plan.';
  facts.hidden = !plan.ready;
  levels.hidden = !plan.ready;
  ageNote.hidden = !plan.ready;
  ageNote.textContent = plan.ready ? plan.ageNote : '';
  disclaimer.hidden = !plan.ready;

  if (!plan.ready) return;

  [
    ['Age', `${plan.profile.age}`],
    ['Weight', `${plan.profile.weightKg} kg`],
    ['Goal', plan.profile.fitnessGoal],
    ['Intensity', plan.profile.workoutIntensity]
  ].forEach(([label, value]) => {
    const fact = document.createElement('span');
    fact.className = 'plan-fact';
    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;
    fact.append(strong, document.createTextNode(value));
    facts.append(fact);
  });

  plan.levels.forEach((level) => {
    const card = document.createElement('article');
    card.className = `plan-level-card ${level.state}`;
    const label = document.createElement('span');
    label.className = 'plan-level-label';
    label.textContent = `LEVEL ${level.number}`;
    const title = document.createElement('h4');
    title.textContent = level.name;
    const prescription = document.createElement('p');
    prescription.textContent = level.prescription;
    const progress = document.createElement('small');
    progress.textContent = level.completion;
    card.append(label, title, prescription, progress);
    levels.append(card);
  });

  plan.days.forEach((day) => {
    const card = document.createElement('article');
    card.className = `plan-day-card ${day.type}`;
    const heading = document.createElement('div');
    heading.className = 'plan-day-heading';
    const name = document.createElement('span');
    name.className = 'plan-day-name';
    name.textContent = day.day;
    const tag = document.createElement('span');
    tag.className = 'plan-day-tag';
    tag.textContent = day.type === 'workout' ? (day.completed ? 'COMPLETED' : `LEVEL ${day.level}`) : day.type === 'recovery' ? 'RECOVERY' : 'REST';
    heading.append(name, tag);
    const title = document.createElement('h4');
    title.textContent = day.title;
    const description = document.createElement('p');
    description.textContent = day.description;
    card.append(heading, title, description);

    if (day.exercises?.length) {
      const exerciseList = document.createElement('ul');
      exerciseList.className = 'plan-exercise-list';
      day.exercises.forEach((exercise) => {
        const exerciseItem = document.createElement('li');
        const exerciseName = document.createElement('span');
        exerciseName.textContent = exercise;
        const demoLink = document.createElement('a');
        demoLink.className = 'exercise-demo-link';
        demoLink.href = `https://www.youtube.com/results?${new URLSearchParams({
          search_query: `${exercise} exercise demonstration proper form`
        })}`;
        demoLink.target = '_blank';
        demoLink.rel = 'noopener noreferrer';
        demoLink.textContent = 'YouTube demo ↗';
        demoLink.setAttribute('aria-label', `Find a ${exercise} exercise demo on YouTube (opens in a new tab)`);
        exerciseItem.append(exerciseName, demoLink);
        exerciseList.append(exerciseItem);
      });
      card.append(exerciseList);
      const prescription = document.createElement('p');
      prescription.className = 'plan-prescription';
      prescription.textContent = day.prescription;
      card.append(prescription);
    }

    if (day.durationMinutes) {
      const details = document.createElement('p');
      details.className = 'plan-day-details';
      details.textContent = `${day.durationMinutes} min · ${day.effort} pace`;
      card.append(details);
    }
    if (day.type === 'workout') {
      if (day.workoutId) {
        const start = document.createElement('button');
        start.type = 'button';
        start.className = 'plan-start-btn';
        start.dataset.workoutId = day.workoutId;
        start.disabled = day.completed;
        start.textContent = day.completed ? 'Workout complete ✓' : 'Start workout →';
        start.addEventListener('click', () => startWorkoutSession(day.workoutId, day.title));
        card.append(start);
      }
      const complete = document.createElement('button');
      complete.type = 'button';
      complete.className = 'plan-complete-btn';
      complete.disabled = !day.canComplete;
      complete.textContent = day.completed ? 'Completed ✓' : 'Mark complete';
      if (day.canComplete) {
        complete.addEventListener('click', async () => {
          complete.disabled = true;
          try {
            const result = await apiRequest(`/api/workout-plan/${day.day}/complete`, { method: 'POST' });
            renderPersonalizedPlan(result.workoutPlan);
            notify(result.message);
          } catch (error) {
            complete.disabled = false;
            notify(error.message);
          }
        });
      }
      card.append(complete);
    }
    week.append(card);
  });
}

document.querySelector('#generateAiPlan').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const previousLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Generating...';
  try {
    const result = await apiRequest('/api/workout-plan/generate', { method: 'POST' });
    renderPersonalizedPlan(result.workoutPlan);
    notify(result.message);
  } catch (error) {
    button.disabled = false;
    button.textContent = previousLabel;
    notify(error.message);
  }
});

function renderNutritionAdvice(advice) {
  const goal = document.querySelector('#nutritionGoal');
  const intro = document.querySelector('#nutritionIntro');
  const tips = document.querySelector('#nutritionTips');
  const disclaimer = document.querySelector('#nutritionDisclaimer');
  tips.replaceChildren();
  goal.textContent = advice.goal || 'General tips';
  intro.textContent = advice.goal
    ? `Practical food and hydration ideas for your ${advice.goal.toLowerCase()} goal and ${advice.workoutIntensity.toLowerCase()}-intensity routine.`
    : 'Complete your fitness profile to tailor these general food and hydration ideas to your goal.';
  advice.tips.forEach((tip) => {
    const card = document.createElement('article');
    card.className = 'nutrition-tip-card';
    const title = document.createElement('h4');
    title.textContent = tip.title;
    const detail = document.createElement('p');
    detail.textContent = tip.detail;
    card.append(title, detail);
    tips.append(card);
  });
  disclaimer.textContent = advice.disclaimer;
}

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  profileSaveStatus.textContent = 'Saving...';
  const formData = new FormData(profileForm);
  const profile = Object.fromEntries(formData.entries());
  profile.age = Number(profile.age);
  profile.weightKg = Number(profile.weightKg);

  try {
    const result = await apiRequest('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    updateProfileDisplay(result.profile);
    const [planResult, nutritionResult] = await Promise.all([
      apiRequest('/api/workout-plan'),
      apiRequest('/api/nutrition-advice')
    ]);
    renderPersonalizedPlan(planResult.workoutPlan);
    renderNutritionAdvice(nutritionResult.nutritionAdvice);
    profileSaveStatus.textContent = result.message;
    notify(result.message);
  } catch (error) {
    profileSaveStatus.textContent = error.message;
    notify(error.message);
  }
});

document.querySelectorAll('.play-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('.workout-card');
    const title = card.querySelector('h4').textContent;
    const workout = window.pulsefitWorkouts?.find((item) => item.title === title);
    const workoutId = button.dataset.workoutId || workout?.id;
    if (!workoutId) {
      notify('Workout details are unavailable.');
      return;
    }
    startWorkoutSession(workoutId);
  });
});

document.querySelector('.menu-btn').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
    document.querySelector('.sidebar').classList.remove('open');
  });
});

Promise.all([
  apiRequest('/api/dashboard'),
  apiRequest('/api/profile'),
  apiRequest('/api/nutrition-advice')
])
  .then(([dashboard, result, nutritionResult]) => {
    window.pulsefitWorkouts = dashboard.workouts;
    renderPersonalizedPlan(dashboard.workoutPlan);
    renderNutritionAdvice(nutritionResult.nutritionAdvice);
    const profile = result.profile;
    profileForm.elements.name.value = profile.name || '';
    profileForm.elements.email.value = profile.email || '';
    profileForm.elements.age.value = profile.age ?? '';
    profileForm.elements.weightKg.value = profile.weightKg ?? '';
    profileForm.elements.fitnessGoal.value = profile.fitnessGoal || '';
    const intensity = profileForm.querySelector(`input[name="workoutIntensity"][value="${profile.workoutIntensity || 'Low'}"]`);
    if (intensity) intensity.checked = true;
    updateProfileDisplay(profile);
  })
  .catch(() => {
    notify('Connect to the FitBuddy AI server to load live data.');
  });

const signInStatus = new URLSearchParams(window.location.search).get('signin');
const signInMessages = {
  sent: 'Sign-in confirmed. A confirmation email has been sent.',
  'not-configured': 'Signed in, but the confirmation email was not sent because email service settings are missing.',
  failed: 'Signed in, but the confirmation email could not be sent. Check your email service settings.'
};
if (signInStatus && signInMessages[signInStatus]) {
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
  window.setTimeout(() => notify(signInMessages[signInStatus]), 300);
}
