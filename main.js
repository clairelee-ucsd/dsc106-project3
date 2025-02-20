import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = [];
let xScale;
let yScale;
let svg;
let selectedCheckboxes = [];
let selectedRadio = "";
let stressData = [];
let selectedExams = [];
let hrData = [];
let bvpData = [];
let tempData = [];
let edaData = [];

async function loadMeasureData() {
    hrData = await d3.csv("data/avg_HR.csv");
    bvpData = await d3.csv("data/avg_BVP.csv");
    tempData = await d3.csv("data/avg_TEMP.csv");
    edaData = await d3.csv("data/avg_EDA.csv");
    console.log("Measure data loaded.");
}

async function loadData(filePath, measure, selectedCheckboxes) {
    // Load the CSV data
    data = await d3.csv(filePath, (row) => {
        const result = {
            test_progress: Number(row.test_progress),
        };

        // Conditionally add midterm1_measure if 'Midterm 1' is selected in checkboxes
        if (selectedCheckboxes.includes("Midterm 1")) {
            result.midterm1_measure = Number(row[`mt1_avg_${measure}`]);
        }

        // Conditionally add midterm2_measure if 'Midterm 2' is selected in checkboxes
        if (selectedCheckboxes.includes("Midterm 2")) {
            result.midterm2_measure = Number(row[`mt2_avg_${measure}`]);
        }

        // Conditionally add final_measure if 'Final' is selected in checkboxes
        if (selectedCheckboxes.includes("Final")) {
            result.final_measure = Number(row[`final_avg_${measure}`]);
        }

        // Return the row with the selected properties
        return result;
    });
}

async function loadStressData() {
    try {
        const response = await d3.json("stress_data.json");
        console.log("Stress data loaded:", response);

        if (!response || response.length === 0) {
            console.error("Stress data is empty!");
            return;
        }

        stressData = response; // Assign globally

        // Set slider range dynamically AFTER data is loaded
        const slider = document.querySelector("#slider input[type='range']");
        slider.min = 0;
        slider.max = stressData.length - 1;
        slider.value = 0; // Start from the beginning

        updateVisualization(0); // Initialize visualization
    } catch (error) {
        console.error("Error loading stress data:", error);
    }
}

function createEmptyScatterPlot() {
    const width = 1800;
    const height = 1000;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    // Remove any existing SVG
    d3.select("#chart").select("svg").remove();

    // Create the empty SVG
    svg = d3
        .select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible")
        .style("width", "100%") // Make it stretch within the container
        .style("height", "auto");

    // Define scales with default ranges
    xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([margin.left, width - margin.right]);

    yScale = d3.scaleLinear()
        .domain([0, 1])
        .range([height - margin.bottom, margin.top]);

    // Create Axes
    const xAxis = d3.axisBottom(xScale)
        .tickValues(d3.range(0, 1.1, 0.1))
        .tickFormat(d => (d * 100).toFixed(0) + '%');
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "29px");

    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "29px");

    // Add Placeholder Titles
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .style("text-anchor", "middle")
        .style("font-size", "40px")
        .text("Test Progress (Select an Exam and Measure)");

    svg.append("text")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "middle")
        .style("font-size", "40px")
        .text("Measure (Select an Exam and Measure)");
}

function createScatterPlot(measure_name) {
    const width = 1800;
    const height = 1000;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    const maxAvgMeasure = Math.max(
        ...data.map((d) => {
            // Extract available measures
            const measures = [];

            if (d.midterm1_measure !== undefined) measures.push(d.midterm1_measure);
            if (d.midterm2_measure !== undefined) measures.push(d.midterm2_measure);
            if (d.final_measure !== undefined) measures.push(d.final_measure);

            // Return the maximum measure value from the available ones
            return Math.max(...measures);
        })
    );

    const minAvgMeasure = Math.min(
        ...data.map(d => {
            // Extract available measures
            const measures = [];

            if (d.midterm1_measure !== undefined) measures.push(d.midterm1_measure);
            if (d.midterm2_measure !== undefined) measures.push(d.midterm2_measure);
            if (d.final_measure !== undefined) measures.push(d.final_measure);

            // Return the maximum measure value from the available ones
            return Math.min(...measures);
        })
    );

    if (svg) {
        svg.remove();
    }

    svg = d3
        .select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible")
        .style("width", "100%") // Make it stretch within the container
        .style("height", "auto");

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([usableArea.left, usableArea.right]);

    yScale = d3
        .scaleLinear()
        .domain([Math.min(0, minAvgMeasure), maxAvgMeasure])
        .range([usableArea.bottom, usableArea.top]);

    const xAxis = d3.axisBottom(xScale)
        .tickValues(d3.range(0, 1.1, 0.1))
        .tickFormat(d => (d * 100).toFixed(0) + '%');

    const yAxis = d3.axisLeft(yScale);

    // Update scales with new ranges
    // xScale.range([usableArea.left, usableArea.right]);
    // yScale.range([usableArea.bottom, usableArea.top]);

    // Add X axis
    svg
        .append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "29px");

    // Add X-axis title
    svg
        .append("text")
        .attr("class", "x-axis-title")
        .attr("x", width / 2)
        .attr("y", height + 50) // Position the title just below the X-axis
        .style("text-anchor", "middle")
        .style("font-size", "40px")
        .text("Test Progress");

    // Add Y axis
    svg
        .append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "29px");

    // Add Y-axis title
    if (selectedRadio === "bvp" && selectedCheckboxes.length === 1 && selectedCheckboxes.includes("Midterm 1")) {
        svg
        .append("text")
        .attr("class", "y-axis-title")
        .attr("x", -height / 2) // Position the title to the left of the Y-axis
        .attr("y", -80) // Position the title higher along the Y-axis
        .attr("transform", "rotate(-90)") // Rotate the text to make it vertical
        .style("text-anchor", "middle")
        .style("font-size", "40px")
        .text(measure_name);
    }
    else
    {
        svg
        .append("text")
        .attr("class", "y-axis-title")
        .attr("x", -height / 2) // Position the title to the left of the Y-axis
        .attr("y", -50) // Position the title higher along the Y-axis
        .attr("transform", "rotate(-90)") // Rotate the text to make it vertical
        .style("text-anchor", "middle")
        .style("font-size", "35px")
        .text(measure_name);
    }

    // Add gridlines
    svg
        .append("g")
        .attr("class", "gridlines")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).tickSize(-usableArea.width).tickFormat(""));

    svg
        .append("g")
        .attr("class", "gridlines")
        .attr("transform", `translate(0, ${height - margin.bottom})`)  // Align with x-axis
        .call(
            d3
                .axisBottom(xScale) // X-axis gridlines
                .tickSize(-usableArea.height) // Extend gridlines vertically
                .tickFormat("")
        );

    // Prepare a color scale for the tests
    // Adjust or extend the range as you see fit
    const colorScale = d3
        .scaleOrdinal()
        .domain(["Midterm 1", "Midterm 2", "Final"])
        .range(["steelblue", "orange", "green"]);

    const dotsGroup = svg.append("g").attr("class", "dots");
    let y = 500;
    let numLeg = 0;

    // Add a vertical line
    const verticalLine = svg
        .append("line")
        .attr("class", "vertical-line")
        .attr("x1", xScale(0))
        .attr("x2", xScale(0))
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "pink")
        .attr("stroke-width", 2);

    // Loop through each selected checkbox/test and draw its series
    selectedCheckboxes.forEach((test) => {
        // Determine the property name in data for this test
        let measureKey;
        switch (test) {
            case "Midterm 1":
                measureKey = "midterm1_measure";
                break;
            case "Midterm 2":
                measureKey = "midterm2_measure";
                break;
            case "Final":
                measureKey = "final_measure";
                break;
        }

        // If the measureKey exists, plot these dots
        if (measureKey) {
            dotsGroup
                .selectAll(`circle.${measureKey}`)
                .data(data)
                .join("circle")
                .attr("class", measureKey)
                .attr("cx", (d) => xScale(d.test_progress))
                .attr("cy", (d) => {
                    // If the measurement is not defined, plot at 0 or skip
                    return d[measureKey] !== undefined
                        ? yScale(d[measureKey])
                        : yScale(0);
                })
                .attr("r", 8)
                .attr("fill", colorScale(test))
                .style("fill-opacity", 0.8)
                .on("mouseenter", function (event, d) {
                    d3.select(event.currentTarget).style("fill-opacity", 1); // Highlight on hover
                    updateTooltipContent(event, d);
                    updateTooltipVisibility(true);
                    updateTooltipPosition(event);
                })
                .on("mouseleave", function (event) {
                    d3.select(event.currentTarget).style("fill-opacity", 0.8);
                    // updateTooltipContent({});
                    updateTooltipVisibility(false);
                });

            if (numLeg === 0) {
                svg
                    .append("text")
                    .attr("x", 700)
                    .attr("y", y - 30)
                    .text("Legend")
                    .style("font-size", "25px")
                    .attr("alignment-baseline", "middle");
            }
            svg
                .append("rect")
                .attr("x", 690)
                .attr("y", y - 10) // Adjust y position to center the rectangle
                .attr("width", 200)
                .attr("height", 20)
                .attr("fill", "white")
                .attr("stroke", "gray");

            svg
                .append("circle")
                .attr("cx", 700)
                .attr("cy", y)
                .attr("r", 6)
                .style("fill", colorScale(test));
            svg
                .append("text")
                .attr("x", 720)
                .attr("y", y)
                .text(measureKey)
                .style("font-size", "15px")
                .attr("alignment-baseline", "middle");

            y += 20;
            numLeg += 1;
            updateTitle(selectedCheckboxes, selectedRadio);
        }
    });

    // Event listener for the slider to update the vertical line position
    const slider = document.querySelector("#slider input[type='range']");
    slider.addEventListener("input", (event) => {
        const value = event.target.value / 89;
        const xPosition = xScale(value);
        verticalLine.attr("x1", xPosition).attr("x2", xPosition);
    });
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById("tooltip");
    tooltip.hidden = !isVisible;
}

function updateTooltipContent(event, data) {
    const progress = document.getElementById("test_progress");
    const measurement_txt = document.getElementById("measurement_name");
    const measurement = document.getElementById("measurement_value");
    measurement.textContent = "";

    if (!data || Object.keys(data).length === 0) return;

    // Display test progress
    progress.textContent = `${(data.test_progress * 100).toFixed(0)}%`;

    if (event.srcElement.className.baseVal === "midterm1_measure") {
        measurement_txt.textContent = `${"Midterm 1"}`;
        measurement.textContent = `${data.midterm1_measure.toFixed(2)}`;
    } else if (event.srcElement.className.baseVal === "midterm2_measure") {
        measurement_txt.textContent = `${"Midterm 2"}`;
        measurement.textContent = `${data.midterm2_measure.toFixed(2)}`;
    } else if (event.srcElement.className.baseVal === "final_measure") {
        measurement_txt.textContent = `${"Final"}`;
        measurement.textContent = `${data.final_measure.toFixed(2)}`;
    }
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById("tooltip");

    const offsetX = 10; // Offset
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
document
    .querySelectorAll('#testFilter input[type="checkbox"]')
    .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            // Update selected checkboxes
            selectedCheckboxes = Array.from(
                document.querySelectorAll('#testFilter input[type="checkbox"]:checked')
            ).map((checkbox) => checkbox.value);

            // Get the selected radio button
            selectedRadio = document.querySelector(
                'input[name="measure"]:checked'
            )?.value;

            if (selectedCheckboxes.length === 0) {
                createEmptyScatterPlot();
                const title = document.querySelector("#graphTitle");
                title.textContent = '';
                return;
            }

            // Re-load and update the graph whenever a checkbox or radio button is selected
            if (selectedRadio) {
                let filePath;
                let measure_name;
                if (selectedRadio === "hr") {
                    filePath = "data/avg_HR.csv";
                    measure_name = "Average Heart Rate (bpm)";
                } else if (selectedRadio === "bvp") {
                    filePath = "data/avg_BVP.csv";
                    measure_name = "Average Blood Volume Pressure (µV)";
                } else if (selectedRadio === "temp") {
                    filePath = "data/avg_TEMP.csv";
                    measure_name = "Average Skin Surface Temperature (°C)";
                } else if (selectedRadio === "eda") {
                    filePath = "data/avg_EDA.csv";
                    measure_name = "Average Electrodermal Activity (μS)";
                }

                // Load the data and update the plot
                loadData(
                    filePath,
                    selectedRadio.toUpperCase(),
                    selectedCheckboxes
                ).then(() => createScatterPlot(measure_name));
            }

            selectedExams = Array.from(
                document.querySelectorAll('#testFilter input[type="checkbox"]:checked')
            ).map((checkbox) => checkbox.value.toLowerCase().replace(" ", "_"));

            if (selectedExams.length === 0) {
                selectedExams = [];
            }

            updateVisualization(
                +document.querySelector("#slider input[type='range']").value
            );
        });
    });

// Event listener for radio buttons
document.querySelectorAll('input[name="measure"]').forEach((radioButton) => {
    radioButton.addEventListener("change", () => {
        selectedRadio = document.querySelector('input[name="measure"]:checked')?.value;

        if (selectedRadio && selectedCheckboxes.length > 0) {
            let filePath;
            let measure_name;
            if (selectedRadio === "hr") {
                filePath = "data/avg_HR.csv";
                measure_name = "Average Heart Rate (bpm)";
            } else if (selectedRadio === "bvp") {
                filePath = "data/avg_BVP.csv";
                measure_name = "Average Blood Volume Pressure (µV)";
            } else if (selectedRadio === "temp") {
                filePath = "data/avg_TEMP.csv";
                measure_name = "Average Skin Surface Temperature (°C)";
            } else if (selectedRadio === "eda") {
                filePath = "data/avg_EDA.csv";
                measure_name = "Average Electrodermal Activity (μS)";
            }

            loadData(filePath, selectedRadio.toUpperCase(), selectedCheckboxes)
                .then(() => createScatterPlot(measure_name));
        } else {
            createEmptyScatterPlot(); // Reset to empty plot if nothing is selected
        }
    });
});

function getAveragedStress(index) {
    if (!stressData || stressData.length === 0) return 0;

    index = Math.min(Math.max(index, 0), stressData.length - 1);
    const selectedStressValues = selectedExams.map(
        (exam) => stressData[index][`${exam}_stress`]
    );

    console.log(
        `Index: ${index}, Selected Exams: ${selectedExams}, Stress Values:`,
        selectedStressValues
    );

    // If only one exam is selected, return its stress directly
    if (selectedStressValues.length === 1) {
        return selectedStressValues[0];
    }

    // Handle midterm-only selection
    const isOnlyMidterms =
        selectedExams.includes("mt1") || selectedExams.includes("mt2");
    if (isOnlyMidterms && !selectedExams.includes("final")) {
        return (
            selectedStressValues.reduce((a, b) => a + b, 0) /
            selectedStressValues.length
        );
    }

    // If final is selected alongside midterms, use the final exam stress **after** midterms end
    if (selectedExams.includes("final")) {
        let midtermEndIndex = Math.max(
            stressData.findIndex((d) => d[`mt1_stress`] === undefined),
            stressData.findIndex((d) => d[`mt2_stress`] === undefined)
        );

        if (index >= midtermEndIndex) {
            return stressData[index]["final_stress"];
        }
    }

    // Compute average stress for selected exams
    return (
        selectedStressValues.reduce((a, b) => a + b, 0) /
        selectedStressValues.length
    );
}

function updateStatBox(elementId, metric, data, index) {
    const container = document.getElementById(elementId);
    container.innerHTML = ""; // Clear previous content

    selectedCheckboxes.forEach((exam) => {
        let value = 0;

        if (exam === "Midterm 1") {
            value = Number(data[index]?.[`mt1_avg_${metric}`]) || 0;
        } else if (exam === "Midterm 2") {
            value = Number(data[index]?.[`mt2_avg_${metric}`]) || 0;
        } else if (exam === "Final") {
            value = Number(data[index]?.[`final_avg_${metric}`]) || 0;
        }

        // Append only the values that exist
        if (value !== 0) {
            const statLine = document.createElement("div");
            statLine.textContent = `${exam}: ${value.toFixed(2)}`;
            container.appendChild(statLine);
        }
    });

    // If no exams are selected, reset the stat box
    if (selectedCheckboxes.length === 0) {
        container.textContent = "-";
    }
}

function updateVisualization(index) {
    if (!stressData || stressData.length === 0) {
        console.warn("Stress data is not available yet.");
        return;
    }

    // Get the selected exams dynamically
    selectedExams = selectedCheckboxes.map((exam) =>
        exam.toLowerCase().replace(" ", "_")
    );

    // Dynamically fetch measure values for selected exams
    const stressLevels = {
        hr: getAveragedStress(index),
        bvp: getAveragedStress(index),
        temp: getAveragedStress(index),
        eda: getAveragedStress(index),
    };

    console.log(`Updating visualization: Index=${index}`, stressLevels);

    // Update stat boxes dynamically
    updateStatBox("heart-rate-value", "HR", hrData, index);
    updateStatBox("bvp-value", "BVP", bvpData, index);
    updateStatBox("temperature-value", "TEMP", tempData, index);
    updateStatBox("eda-value", "EDA", edaData, index);

    // Update overlay color based on overall stress level
    const overallStress =
        (stressLevels.hr + stressLevels.bvp + stressLevels.temp + stressLevels.eda) / 4;
    const colorScale = d3.scaleLinear().domain([0.2, 0.8]).range(["blue", "red"]);
    document.querySelector(".overlay").style.backgroundColor = colorScale(overallStress);
}


// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    createEmptyScatterPlot(); // Show the empty plot initially

    const slider = document.querySelector("#slider input[type='range']");
    slider.addEventListener("input", (event) => {
        const index = +event.target.value;
        updateVisualization(index);
    });

    document.querySelectorAll('#testFilter input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            selectedExams = Array.from(
                document.querySelectorAll('#testFilter input[type="checkbox"]:checked')
            ).map((cb) => cb.value.toLowerCase().replace(" ", "_"));

            if (selectedExams.length === 0) {
                selectedExams = [];
                createEmptyScatterPlot(); // Reset to empty plot if no selection
            } else {
                updateVisualization(+document.querySelector("#slider input[type='range']").value);
            }
        });
    });

    loadStressData();
    loadMeasureData();
    
});

async function updateTitle(tests, measure) {
    const title = document.querySelector("#graphTitle");
    title.textContent = `${tests.join(", ")} Exam: ${measure.toUpperCase()} Data`;
}

document.addEventListener("DOMContentLoaded", function () {
    const sliderContainer = document.getElementById("slider-container");
    const filterContainer = document.getElementById("filter-container");

    let sliderOffset = sliderContainer.offsetTop; // Initial position of slider

    window.addEventListener("scroll", function () {
        if (window.scrollY >= sliderOffset) {
            sliderContainer.style.position = "fixed";
            sliderContainer.style.top = "0";
            sliderContainer.style.left = "0";
            sliderContainer.style.width = "100%";
            sliderContainer.style.zIndex = "1000";

            // Fix filter-container when the slider is fixed
            filterContainer.style.position = "fixed";
            filterContainer.style.top = `${sliderContainer.offsetHeight}px`; // Place it just below the slider
            filterContainer.style.left = "30px"; // Maintain left position
        } else {
            sliderContainer.style.position = "relative";

            // Reset filter-container position when slider is not fixed
            filterContainer.style.position = "absolute";
            filterContainer.style.top = ""; // Reset to default positioning
            filterContainer.style.left = "";
        }
    });
});