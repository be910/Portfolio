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

// Refactor all plotting into one function
function renderPieChart(projectsGiven) {
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );
  
  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });
  
  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData.map((d) => arcGenerator(d));
  
  // Clear up paths and legends
  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();
  
  let legend = d3.select('.legend');
  legend.selectAll('li').remove();
  
  // Update paths and legends
  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  
  newArcs.forEach((arc, i) => {
    svg
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(i))
      .attr('class', i === selectedIndex ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        
        svg
          .selectAll('path')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');
        
        // Update all legend items to apply the correct class
        legend
          .selectAll('li')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');
        
        // Filter and render projects based on selection
        if (selectedIndex === -1) {
          // No selection, render all projects
          renderProjects(projectsGiven, projectsContainer, 'h2');
        } else {
          // Filter projects by the selected year
          const selectedYear = newData[selectedIndex].label;
          const filteredProjects = projectsGiven.filter(project => project.year === selectedYear);
          renderProjects(filteredProjects, projectsContainer, 'h2');
        }
      });
  });
  
  newData.forEach((d, i) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(i)}`)
      .attr('class', i === selectedIndex ? 'selected' : '')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        
        svg
          .selectAll('path')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');
        
        // Update all legend items to apply the correct class
        legend
          .selectAll('li')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');
        
        if (selectedIndex === -1) {
          renderProjects(projectsGiven, projectsContainer, 'h2');
        } else {
          const selectedYear = newData[i].label;
          const filteredProjects = projectsGiven.filter(project => project.year === selectedYear);
          renderProjects(filteredProjects, projectsContainer, 'h2');
        }
      });
  });
}

renderPieChart(projects);
renderProjects(projects, projectsContainer, 'h2');

// Event listener for search
let query = '';
let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('change', (event) => {
  query = event.target.value;
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});