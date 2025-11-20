import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
let xScale, yScale;
let commitProgress = 100;


// Load CSV data
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}


function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
        writable: true,
        configurable: true
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  // Make absolutely sure the container is empty
  const statsContainer = d3.select('#stats');
  statsContainer.selectAll('*').remove();
  
  // Create the dl element
  const dl = statsContainer.append('dl').attr('class', 'stats');

  // Add total LOC (column 1)
  dl.append('dt').text('Total LOC').style('grid-column', '1');
  dl.append('dd').text(data.length).style('grid-column', '1');

  // Add total commits (column 2)
  dl.append('dt').text('Total commits').style('grid-column', '2');
  dl.append('dd').text(commits.length).style('grid-column', '2');

  // Add Number of files in the codebase (column 3)
  const fileCounts = d3.rollup(
    data,
    (v) => v.length,
    (d) => d.file
  );

  dl.append('dt').text('Number of files').style('grid-column', '3');
  dl.append('dd').text(fileCounts.size).style('grid-column', '3');

  // Add day of the week that most work is done (column 4)
  if (commits.length > 0) {
    const dayCounts = d3.rollup(
      commits,
      (v) => v.length,
      (d) => d.datetime.getDay()
    );
    const maxDayEntry = Array.from(dayCounts).reduce((max, entry) => 
      entry[1] > max[1] ? entry : max
    );
    const mostActiveDay = maxDayEntry[0];
    dl.append('dt').text('Most active day of the week').style('grid-column', '4');
    dl.append('dd').text(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][mostActiveDay]).style('grid-column', '4');
  } else {
    dl.append('dt').text('Most active day of the week').style('grid-column', '4');
    dl.append('dd').text('N/A').style('grid-column', '4');
  }

  // Add hour of the day that most work is done (column 5)
  if (commits.length > 0) {
    const hourCounts = d3.rollup(
      commits,
      (v) => v.length,
      (d) => d.datetime.getHours()
    );

    const maxHourEntry = Array.from(hourCounts).reduce((max, entry) => 
      entry[1] > max[1] ? entry : max
    );
    const mostActiveHour = maxHourEntry[0];
    dl.append('dt').text('Most active hour of the day').style('grid-column', '5');
    dl.append('dd').text(`${mostActiveHour}:00 - ${mostActiveHour + 1}:00`).style('grid-column', '5');
  } else {
    dl.append('dt').text('Most active hour of the day').style('grid-column', '5');
    dl.append('dd').text('N/A').style('grid-column', '5');
  }
}

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id.substring(0, 7); 
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.time;
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function createBrushSelector(svg) {
  svg.call(d3.brush().on('start brush end', brushed));
  svg.selectAll('.dots, .overlay ~ *').raise();
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}


function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }
  
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}



function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');
    
    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, width])
        .nice();

    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .attr('class', 'x-axis') // new line to mark the g tag
        .call(xAxis);

    svg
      .append('g')
      .attr('transform', `translate(${usableArea.left}, 0)`)
      .attr('class', 'y-axis') // just for consistency
      .call(yAxis);
    
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3
        .scaleSqrt() 
        .domain([minLines, maxLines])
        .range([2, 30]);
    
    // Sort commits by total lines in descending order
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(sortedCommits, (d) => d.id) // change this line
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill-opacity', 0.7) 
        .attr('fill', 'steelblue')
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
    })
        .on('mousemove', (event) => {
        updateTooltipPosition(event);
    })
        .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
  });

    createBrushSelector(svg);
}


function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  // Clear out the existing xAxis and then create a new one
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}


let data = await loadData();
let commits = processCommits(data);
commits.sort((a, b) => a.datetime - b.datetime); 

let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime)
  ])
  .range([0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);

// renderCommitInfo will be called by onTimeSliderChange
renderScatterPlot(data, commits);

let filteredCommits = commits;
// Define colors here for this page
let colors = d3.scaleOrdinal(d3.schemeTableau10);


// function updateFileDisplay(filteredCommits) {
//   let lines = filteredCommits.flatMap((d) => d.lines);
//   let files = d3
//     .groups(lines, (d) => d.file)
//     .map(([name, lines]) => {
//       return { name, lines };
//     })
//     .sort((a, b) => b.lines.length - a.lines.length);

//   console.log('Updating file display with', files.length, 'files');

//   let filesContainer = d3
//     .select('#files')
//     .selectAll('div')
//     .data(files, (d) => d.name)
//     .join(
//       (enter) => {
//         console.log('Enter selection - creating new divs');
//         return enter.append('div').call((div) => {
//           div.append('dt').call(dt => {
//             dt.append('code');
//             dt.append('div').attr('class', 'line-count');
//           });
//           div.append('dd');
//         });
//       },
//       (update) => {
//         console.log('Update selection - updating existing divs');
//         return update;
//       },
//       (exit) => {
//         console.log('Exit selection - removing divs');
//         return exit.remove();
//       }
//     );

//   // Update file names for ALL divs (both new and existing)
//   filesContainer.select('dt > code').text((d) => d.name);
//   filesContainer.select('dd').text((d) => `${d.lines.length} lines`);
  
  
//   filesContainer
//     .select('dd')
//     .selectAll('div')
//     .data((d) => d.lines)
//     .join('div')
//     .attr('class', 'loc')
//     .attr('style', (d) => `--color: ${colors(d.type)}`);
// }

function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      // This code only runs when the div is initially rendered
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt').call(dt => {
            dt.append('code');
            dt.append('small');
          });
          div.append('dd');
        }),
    );

  // This code updates the div info
  filesContainer.select('dt > code').text((d) => d.name);
  filesContainer.select('dt > small').text((d) => `${d.lines.length} lines`);
  
  // Add visualization divs
  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (line) => `--color: ${colors(line.type)}`);
}


function onTimeSliderChange() {
  commitProgress = document.getElementById('commit-progress').value;
  commitMaxTime = timeScale.invert(commitProgress);
  
  const sliderTimeElement = document.getElementById('slider-time');
  if (sliderTimeElement) {
    sliderTimeElement.textContent = commitMaxTime.toLocaleString('en', {
      dateStyle: "long",
      timeStyle: "short"
    });
  }

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  
  // Filter data to match filtered commits
  let filteredCommitIds = new Set(filteredCommits.map(d => d.id));
  let filteredData = data.filter(line => filteredCommitIds.has(line.commit));
  
  // Render stats (clearing happens inside renderCommitInfo)
  renderCommitInfo(filteredData, filteredCommits);
  updateScatterPlot(filteredData, filteredCommits);
  updateFileDisplay(filteredCommits); 
}

if (document.getElementById('commit-progress')) {
  document.getElementById('commit-progress').addEventListener('input', onTimeSliderChange);
  
  // Initialize on page load
  onTimeSliderChange();
} else {
  console.error('Could not find #commit-progress element');
}

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );


import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

function onStepEnter(response) {
  const commitDate = response.element.__data__.datetime;
  console.log(commitDate);
  
  // Filter commits up to this date (same logic as slider)
  filteredCommits = commits.filter((d) => d.datetime <= commitDate);
  
  // Filter data to match filtered commits
  let filteredCommitIds = new Set(filteredCommits.map(d => d.id));
  let filteredData = data.filter(line => filteredCommitIds.has(line.commit));
  
  // Update all visualizations (same as slider)
  renderCommitInfo(filteredData, filteredCommits);
  updateScatterPlot(filteredData, filteredCommits);
  updateFileDisplay(filteredCommits);
  
  // Also update the slider to match
  commitProgress = timeScale(commitDate);
  document.getElementById('commit-progress').value = commitProgress;
  document.getElementById('slider-time').textContent = commitDate.toLocaleString('en', {
    dateStyle: "long",
    timeStyle: "short"
  });
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);