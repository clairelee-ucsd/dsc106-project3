import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = [];
let xScale;
let yScale;
let svg;
let selectedCheckboxes = [];
let selectedRadio = '';

async function loadData(filePath, measure, selectedCheckboxes) {
    // Load the CSV data
    data = await d3.csv(filePath, (row) => {
        const result = {
            test_progress: Number(row.test_progress),
        };

        // Conditionally add midterm1_measure if 'Midterm 1' is selected in checkboxes
        if (selectedCheckboxes.includes('Midterm 1')) {
            result.midterm1_measure = Number(row[`mt1_avg_${measure}`]);
        }

        // Conditionally add midterm2_measure if 'Midterm 2' is selected in checkboxes
        if (selectedCheckboxes.includes('Midterm 2')) {
            result.midterm2_measure = Number(row[`mt2_avg_${measure}`]);
        }

        // Conditionally add final_measure if 'Final' is selected in checkboxes
        if (selectedCheckboxes.includes('Final')) {
            result.final_measure = Number(row[`final_avg_${measure}`]);
        }

        // Return the row with the selected properties
        return result;
    });
}

function createScatterPlot(measure_name) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    const maxAvgMeasure = Math.max(
        ...data.map(d => {
            // Extract available measures
            const measures = [];

            if (d.midterm1_measure !== undefined) measures.push(d.midterm1_measure);
            if (d.midterm2_measure !== undefined) measures.push(d.midterm2_measure);
            if (d.final_measure !== undefined) measures.push(d.final_measure);

            // Return the maximum measure value from the available ones
            return Math.max(...measures);
        })
    );

    if (svg) {
        svg.remove();
    }

    svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.test_progress))
        .range([0, 1]);

    yScale = d3
        .scaleLinear()
        .domain([0, maxAvgMeasure])
        .range([height - margin.bottom, margin.top]);

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    // Add X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(xAxis);

    // Add X-axis title
    svg
        .append('text')
        .attr('class', 'x-axis-title')
        .attr('x', width / 2)
        .attr('y', height + 20)  // Position the title just below the X-axis
        .style('text-anchor', 'middle')
        .style('font-size', '16px')
        .text('Test Progress');

    // Add Y axis
    svg
        .append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(yAxis);

    // Add Y-axis title
    svg
        .append('text')
        .attr('class', 'y-axis-title')
        .attr('x', -height / 2)  // Position the title to the left of the Y-axis
        .attr('y', -10)  // Position the title higher along the Y-axis
        .attr('transform', 'rotate(-90)')  // Rotate the text to make it vertical
        .style('text-anchor', 'middle')
        .style('font-size', '16px')
        .text(measure_name);

    svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).tickSize(-usableArea.width).tickFormat(''));

    svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(0, ${height - margin.bottom})`)  // Position gridlines at the bottom
        .call(d3.axisBottom(xScale)  // X-axis gridlines
            .tickSize(-usableArea.height)  // Extend gridlines vertically
            .tickFormat(''));

    // Prepare a color scale for the tests
    // Adjust or extend the range as you see fit
    const colorScale = d3.scaleOrdinal()
        .domain(['Midterm 1', 'Midterm 2', 'Final'])
        .range(['steelblue', 'orange', 'green']);

    const dotsGroup = svg.append('g').attr('class', 'dots');

    // Loop through each selected checkbox/test and draw its series
    selectedCheckboxes.forEach(test => {
        // Determine the property name in data for this test
        let measureKey;
        switch (test) {
            case 'Midterm 1':
                measureKey = 'midterm1_measure';
                break;
            case 'Midterm 2':
                measureKey = 'midterm2_measure';
                break;
            case 'Final':
                measureKey = 'final_measure';
                break;
        }

        // If the measureKey exists, plot these dots
        if (measureKey) {
            dotsGroup
                .selectAll(`circle.${measureKey}`)
                .data(data)
                .join('circle')
                .attr('class', measureKey)
                .attr('cx', d => xScale(d.test_progress))
                .attr('cy', d => {
                    // If the measurement is not defined, plot at 0 or skip
                    return d[measureKey] !== undefined
                        ? yScale(d[measureKey])
                        : yScale(0);
                })
                .attr('r', 5)
                .attr('fill', colorScale(test))
                .style('fill-opacity', 0.8)
                .on('mouseenter', function (event, d) {
                    d3.select(event.currentTarget).style('fill-opacity', 1); // Highlight on hover
                    updateTooltipContent(d);
                    updateTooltipVisibility(true);
                    updateTooltipPosition(event);
                })
                .on('mouseleave', function (event) {
                    d3.select(event.currentTarget).style('fill-opacity', 0.8);
                    updateTooltipContent(null);
                    updateTooltipVisibility(false);
                });
        }
    });

}


function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('test-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipContent(data) {
    const progress = document.getElementById('test_progress');
    const measurement = document.getElementById('measurement_value');

    if (data == null) return;

    progress.textContent = `Progress: ${data.test_progress.toFixed(2)}`;  // Display test progress
    
    let measureValue;
    let label;
    if (measureKey === 'midterm1_measure') {
        measureValue = data.midterm1_measure;
        label = 'Midterm 1';
    } else if (measureKey === 'midterm2_measure') {
        measureValue = data.midterm2_measure;
        label = 'Midterm 2';
    } else if (measureKey === 'final_measure') {
        measureValue = data.final_measure;
        label = 'Final';
    }
    measurement.textContent = `${label}: ${measureValue.toFixed(2)}`;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('test-tooltip');
    const offsetX = 10;  // Offset
    const offsetY = 10;

    // Get the current mouse position
    let tooltipX = event.clientX + offsetX;
    let tooltipY = event.clientY + offsetY;

    // Get the window's dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Get the tooltip's width and height
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    // Check if the tooltip exceeds the window's right edge and adjust position
    if (tooltipX + tooltipWidth > windowWidth) {
        tooltipX = windowWidth - tooltipWidth - offsetX;
    }

    // Check if the tooltip exceeds the window's bottom edge and adjust position
    if (tooltipY + tooltipHeight > windowHeight) {
        tooltipY = windowHeight - tooltipHeight - offsetY;
    }

    // Update the tooltip position
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
}


// Event listener for checkboxes
document.querySelectorAll('#testFilter input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
        // Update selected checkboxes
        selectedCheckboxes = Array.from(document.querySelectorAll('#testFilter input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        // Get the selected radio button
        selectedRadio = document.querySelector('input[name="measure"]:checked')?.value;

        // Re-load and update the graph whenever a checkbox or radio button is selected
        if (selectedRadio) {
            let filePath;
            let measure_name;
            if (selectedRadio === 'hr') {
                filePath = 'data/avg_HR.csv';
                measure_name = 'Average Heart Rate (bpm)';
            } else if (selectedRadio === 'bvp') {
                filePath = 'data/avg_BVP.csv';
                measure_name = 'Average Blood Volume Pressure (µV)';
            } else if (selectedRadio === 'temp') {
                filePath = 'data/avg_TEMP.csv';
                measure_name = 'Average Skin Surface Temperature (°C)';
            } else if (selectedRadio === 'eda') {
                filePath = 'data/avg_EDA.csv';
                measure_name = 'Average Electrodermal Activity (μS)';
            }

            // Load the data and update the plot
            loadData(filePath, selectedRadio.toUpperCase(), selectedCheckboxes)
                .then(() => createScatterPlot(measure_name));
        }
    });
});

// Event listener for radio buttons
document.querySelectorAll('input[name="measure"]').forEach((radioButton) => {
    radioButton.addEventListener('change', () => {
        // Update selected radio button
        selectedRadio = document.querySelector('input[name="measure"]:checked')?.value;

        // Re-load and update the graph whenever a radio button is selected
        if (selectedRadio && selectedCheckboxes.length > 0) {
            let filePath;
            let measure_name;
            if (selectedRadio === 'hr') {
                filePath = 'data/avg_HR.csv';
                measure_name = 'Average Heart Rate (bpm)';
            } else if (selectedRadio === 'bvp') {
                filePath = 'data/avg_BVP.csv';
                measure_name = 'Average Blood Volume Pressure (µV)';
            } else if (selectedRadio === 'temp') {
                filePath = 'data/avg_TEMP.csv';
                measure_name = 'Average Skin Surface Temperature (°C)';
            } else if (selectedRadio === 'eda') {
                filePath = 'data/avg_EDA.csv';
                measure_name = 'Average Electrodermal Activity (μS)';
            }

            // Load the data and update the plot
            loadData(filePath, selectedRadio.toUpperCase(), selectedCheckboxes)
                .then(() => createScatterPlot(measure_name));
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const slider = document.querySelector("#slider input[type='range']");
    const overlay = document.querySelector(".overlay");

    // Define a color scale from blue (calm) to red (stressed)
    const colorScale = d3.scaleLinear()
        .domain([0, 100])
        .range(["blue", "red"]);

    slider.addEventListener("input", () => {
        const stressLevel = +slider.value;
        const newColor = colorScale(stressLevel);
        overlay.style.backgroundColor = newColor;
    });
});