// TODO: if using a proper framework/package structure, import the error helper
// (working for the moment due to global import in the index.html file)

// URLs for fetching data
const AVAILABLE_DANDISET_IDS_URL = "https://raw.githubusercontent.com/CodyCBakerPhD/dandiset-access-summaries/main/content/dandiset_ids.txt";
const BASE_TSV_URL = "https://raw.githubusercontent.com/CodyCBakerPhD/dandiset-access-summaries/main/content/summaries";

const REGION_CODES_TO_LATITUDE_LONGITUDE_URL = "https://raw.githubusercontent.com/CodyCBakerPhD/dandiset-access-summaries/main/content/region_codes_to_latitude_longitude.yaml";
let REGION_CODES_TO_LATITUDE_LONGITUDE = {};

// TODO: Remember that when using opencagedata, the "lat"/"lon" are reversed ("lon"/"lat")
fetch(jsonUrl)
    .then((response) => {
        if (!response.ok) {
            throw new Error(`Failed to fetch JSON file: ${response.statusText}`);
        }
        return response.json();
    })
    .then((data) => {
        REGION_CODES_TO_LATITUDE_LONGITUDE = data;
    })
    .catch((error) => {
        console.error("Error loading JSON file:", error);
    });

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
    .then((dandiset_id_text) => {
        const available_dandiset_ids = dandiset_id_text.split("\n").filter((id) => id.trim() !== "");
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

        fetch (REGION_CODES_TO_LATITUDE_LONGITUDE_URL)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch region codes to latitude/longitude: ${response.statusText}`);
            }
            return response.text();
        })
        .then((region_codes_to_latitude_longitude_text) => {
            const region_codes_to_latitude_longitude = region_codes_to_latitude_longitude_text.split("\n").filter((id) => id.trim() !== "");
        }

        // Load the plot for the first ID by default
        const default_over_time_plot_element_id = "over_time_plot"
        if (available_dandiset_ids.length > 0) {
            load_over_time_plot(available_dandiset_ids[0]);
            load_per_asset_histogram(available_dandiset_ids[0]);
            load_geographic_heatmap(available_dandiset_ids[0]);
        }

        // Update the plots when a new Dandiset ID is selected
        selector.addEventListener("change", (event) => {
            const target = event.target;
            load_over_time_plot(target.value);
            load_per_asset_histogram(target.value);
            load_geographic_heatmap(target.value);
        });
    })
    .catch((error) => {
        console.error("Error:", error);

        // Only overlay error message over first plot element
        const over_time_plot_element = document.getElementById(default_over_time_plot_element_id);
        if (over_time_plot_element) {
            over_time_plot_element.innerText = "Failed to load Dandiset IDs and populate default plots.";
        }
    });

// Function to fetch and render the over time for a given Dandiset ID
function load_over_time_plot(dandiset_id) {
    const by_day_summary_tsv_url = `${BASE_TSV_URL}/${dandiset_id}/dandiset_summary_by_day.tsv`;
    const plot_element_id = "over_time_plot"

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

            const plot_data = [
                {
                    type: "scatter",
                    mode: "lines+markers",
                    x: dates,
                    y: bytes_sent,
                }
            ];

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

            Plotly.newPlot(plot_element_id, plot_data, layout);
        })
        .catch((error) => {
            console.error("Error:", error);
            const plot_element = document.getElementById(plot_element_id);
            if (plot_element) {
                plot_element.innerText = "Failed to load data for per day plot.";
            }
        });
}

// Function to fetch and render histogram over asset IDs
function load_per_asset_histogram(dandiset_id) {
    const by_day_summary_tsv_url = `${BASE_TSV_URL}/${dandiset_id}/dandiset_summary_by_asset.tsv`;
    const plot_element_id = "per_asset_histogram";

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

            const asset_names = data.map((row) => {
                const filename = row[0].split("/").at(-1);
                const suffix = filename.split(".").at(-1);

                if (suffix !== "nwb") {
                    throw new Error("Currently only supports NWB files.");
                }

                const subject_and_session = filename.split("_");
                const subject = subject_and_session[0].split("-").slice(1).join("-");
                const session = subject_and_session[1].split("-").slice(1).join("-");
                return `${subject}/${session}`;
            });
            const bytes_sent = data.map((row) => parseInt(row[1], 10));

            const plot_data = [
                {
                    type: "bar",
                    x: asset_names,
                    y: bytes_sent,
                }
            ];


            const layout = {
                title: {
                    text: `Bytes sent per asset`,
                    font: { size: 24 }
                },
                xaxis: {
                    title: {
                        text: "Asset Name",
                        font: { size: 16 }
                    },
                    tickangle: -45,
                    tickfont: { size: 10 },
                    automargin: true,
                },
                yaxis: {
                    title: {
                        text: "Bytes",
                        font: { size: 16 }
                    }
                },
            };

            Plotly.newPlot(plot_element_id, plot_data, layout);
        })
        .catch((error) => {
            console.error("Error:", error);
            const plot_element = document.getElementById(plot_element_id);
            if (plot_element) {
                plot_element.innerText = "Failed to load data for per asset (NWB datasets only).";
            }
        });
}

// Function to fetch and render heatmap over geography
function load_geographic_heatmap(dandiset_id) {
    const by_region_summary_tsv_url = `${BASE_TSV_URL}/${dandiset_id}/dandiset_summary_by_region.tsv`;
    const plot_element_id = "geography_heatmap";

    fetch(by_region_summary_tsv_url)
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

            const latitudes = [];
            const longitudes = [];
            const bytes_sent = [];
            const hover_texts = [];

            data.forEach((row) => {
                const region = row[0];
                const bytes = parseInt(row[1], 10);
                const coordinates = REGION_CODES_TO_LATITUDE_LONGITUDE[region];

                if (coordinates) {
                    latitudes.push(coordinates.latitude);
                    longitudes.push(coordinates.longitude);
                    bytes_sent.push(bytes);
                    hover_texts.push(`${region}: ${bytes} bytes`);
                }
            });

            const max_bytes_sent = Math.max(...bytes_sent);
            const plot_data = [
                {
                    type: "scattergeo",
                    mode: "markers",
                    lat: latitudes,
                    lon: longitudes,
                    text: hover_texts,
                    marker: {
                        symbol: "circle",
                        size: bytes_sent.map((bytes) => bytes / max_bytes_sent * 25),
                        color: bytes_sent,
                        colorscale: "Viridis",
                        colorbar: {
                            title: "Bytes Sent",
                        },
                        opacity: 1,
                    },
                },
            ];

            const layout = {
                title: {
                    text: "Bytes Sent by Region",
                    font: { size: 24 },
                },
                geo: {
                    projection: {
                        type: "equirectangular",
                    },
                },
            };

            Plotly.newPlot(plot_element_id, plot_data, layout);
        })
        .catch((error) => {
            console.error("Error:", error);
            const plot_element = document.getElementById(plot_element_id);
            if (plot_element) {
                plot_element.innerText = "Failed to load data for geographic heatmap.";
            }
        });
}