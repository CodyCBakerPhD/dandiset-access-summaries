// TODO: if using a proper framework/package structure, import the error helper
// (working for the moment due to global import in the index.html file)

// URLs for fetching data
const AVAILABLE_DANDISET_IDS_URL = "https://raw.githubusercontent.com/CodyCBakerPhD/dandiset-access-summaries/main/summaries/dandiset_ids.txt";
const BASE_TSV_URL = "https://raw.githubusercontent.com/CodyCBakerPhD/dandiset-access-summaries/main/summaries";

// Check if Plotly is loaded after the window loads
window.addEventListener("load", () => {
    if (typeof Plotly === "undefined") {
        handlePlotlyError();
    }
});

// Populate the dropdown with IDs and render initial plots
fetch(AVAILABLE_DANDISET_IDS_URL)
    .then((response) => {
        if (!response.ok) {
            throw new Error(`Failed to fetch available Dandiset IDs: ${response.statusText}`);
        }
        return response.text();
    })
    .then((text) => {
        const available_dandiset_ids = text.split("\n").filter((id) => id.trim() !== "");
        const selector = document.getElementById("dandiset_selector");

        if (!selector) {
            throw new Error("Dropdown element not found on main page.");
        }

        available_dandiset_ids.forEach((id) => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = id;
            selector.appendChild(option);
        });

        // Load the plot for the first ID by default
        const default_plot_element_id = "over_time_plot"
        if (available_dandiset_ids.length > 0) {
            load_over_time_plot(available_dandiset_ids[0]);
        }

        // Update the plots when a new Dandiset ID is selected
        selector.addEventListener("change", (event) => {
            const target = event.target;
            load_over_time_plot(target.value);
        });
    })
    .catch((error) => {
        console.error("Error:", error);
        const chartElement = document.getElementById(default_plot_element_id);
        if (chartElement) {
            chartElement.innerText = "Failed to load Dandiset IDs and populate default plot.";
        }
    });

// Function to fetch and render the over time for a given Dandiset ID
function load_over_time_plot(dandiset_id) {
    const by_day_summary_tsv_url = `${BASE_TSV_URL}/${dandiset_id}/dandiset_summary_by_day.tsv`;

    fetch(by_day_summary_tsv_url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch TSV file: ${response.statusText}`);
            }
            return response.text();
        })
        .then((text) => {
            const rows = text.split("\n").filter((row) => row.trim() !== "");
            if (rows.length < 2) {
                throw new Error("TSV file does not contain enough data.");
            }

            const data = rows.slice(1).map((row) => row.split("\t"));

            const dates = data.map((row) => row[0]);
            const bytes_sent = data.map((row) => parseInt(row[1], 10));

            const plotData = [
                {
                    x: dates,
                    y: bytes_sent,
                    type: "scatter",
                    mode: "lines+markers",
                }
            ];

            const plot_element_id = "over_time_plot"

            const layout = {
                title: {
                    text: `Bytes sent per day`,
                    font: { size: 24 }
                },
                xaxis: {
                    title: {
                        text: "Date",
                        font: { size: 16 }
                    }
                },
                yaxis: {
                    title: {
                        text: "Bytes",
                        font: { size: 16 }
                    }
                },
            }

            Plotly.newPlot(plot_element_id, plotData, layout);
        })
        .catch((error) => {
            console.error("Error:", error);
            const plot_element = document.getElementById(plot_element_id);
            if (plot_element) {
                plot_element.innerText = "Failed to load data.";
            }
        });
}