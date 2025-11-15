import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

const projectsTitle = document.querySelector('.projects-title');
if (projectsTitle && projects) {
  const count = projects.length;
  projectsTitle.textContent = `${count} ${count === 1 ? 'project' : 'Projects'}`;
}

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let selectedIndex = -1;
let query = '';

// Function to render the pie chart
function renderPieChart(projectsGiven) {
  const rolledData = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  );
  
  const pieData = rolledData.map(([year, count]) => ({ value: count, label: year }));
  const pieGenerator = d3.pie().value(d => d.value);
  const arcData = pieGenerator(pieData);
  const arcs = arcData.map(d => arcGenerator(d));

  const svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();

  const legend = d3.select('.legend');
  legend.selectAll('li').remove();

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // Draw arcs
  arcs.forEach((arc, i) => {
    svg.append('path')
      .attr('d', arc)
      .attr('fill', colors(i))
      .attr('class', i === selectedIndex ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll('path')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');

        legend.selectAll('li')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');

        filterAndRender();
      });
  });

  // Draw legend
  pieData.forEach((d, i) => {
    legend.append('li')
      .attr('style', `--color:${colors(i)}`)
      .attr('class', i === selectedIndex ? 'selected' : '')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll('path')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');
        
        legend.selectAll('li')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');

        filterAndRender();
      });
  });
}

// Function to filter projects by pie selection and search query
function filterAndRender() {
  const filteredProjects = projects.filter(project => {
    const matchesYear = selectedIndex === -1 || project.year === d3.rollups(projects, v => v.length, d => d.year)[selectedIndex][0] === project.year;
    const matchesSearch = query === '' || Object.values(project).join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesYear && matchesSearch;
  });

  renderProjects(filteredProjects, projectsContainer, 'h2');
}

// Initial render
renderPieChart(projects);
filterAndRender();

// Event listener for search input
const searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  selectedIndex = -1;
  renderPieChart(projects);  // reset pie chart selection
  filterAndRender();
});
