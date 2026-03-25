import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function init() {
  const projects = await fetchJSON('./lib/projects.json');
  const latestProjects = projects.slice().sort((a, b) => b.year - a.year).slice(0, 3);
  const projectsContainer = document.querySelector('.projects');
  renderProjects(latestProjects, projectsContainer, 'h2');

  const githubData = await fetchGitHubData('be910');
  const profileStats = document.querySelector('#profile-stats');
  if (profileStats) {
    profileStats.innerHTML = `
      <dl class="stats-grid">
        <dt>PUBLIC REPOS</dt>
        <dt>PUBLIC GISTS</dt>
        <dt>FOLLOWING</dt>
        <dd>${githubData.public_repos}</dd>
        <dd>${githubData.public_gists}</dd>
        <dd>${githubData.following}</dd>
      </dl>
  `;
  }
}

init();