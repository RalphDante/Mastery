export function getCurrentTutorialStep(tutorials, tutorialName) {
  return tutorials[tutorialName]?.step || 1;
}

export function advanceTutorial(tutorials, tutorialName) {
  // Logic to advance step
}