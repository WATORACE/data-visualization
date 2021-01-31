import React, { useEffect, useRef, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import Papa, { ParseResult as PapaParseResult } from "papaparse";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { deepCopy } from "./utils";
import _ from "lodash";

function App() {
    const fileInput = useRef(null as HTMLInputElement | null);
    const rawConfig = useRef(null as HTMLTextAreaElement | null);
    const [errorMsgs, setErrorMsgs] = useState([] as Array<string>);
    const [datasets, setDatasets] = useState(
        [] as Array<{ file: File | undefined; parsed: PapaParseResult<unknown> }>
    );
    const [visualizations, setVisualizations] = useState([
        {
            title: "Steering",
            height: 300,
            cursor: {
                sync: {
                    key: "moo",
                },
            },
            inputs: [
                {
                    label: "time (s)",
                    data: "0.TimeOfUpdate",
                },
                {
                    label: "Steering Wheel Angle (rad)",
                    stroke: "red",
                    width: 1,
                    data: "0.SteeringWheelAngle",
                },
                // {
                //   label: "Steering Wheel Angle (deg)",
                //   stroke: "blue",
                //   width: 1,
                // },
            ],
        },
        {
            title: "Speed (in vehicle frame)",
            height: 300,
            cursor: {
                sync: {
                    key: "moo",
                },
            },
            inputs: [
                {
                    label: "time (s)",
                    data: "0.TimeOfUpdate",
                },
                {
                    label: "cdgSpeed_x",
                    stroke: "blue",
                    width: 1,
                    data: "0.cdgSpeed_x",
                },
                {
                    label: "cdgSpeed_y",
                    stroke: "green",
                    width: 1,
                    data: "0.cdgSpeed_y",
                },
            ],
        },
    ]);

    // plot datasets on change (rerender of the react component)
    useEffect(() => {
        if (visualizations.length === 0) {
            return;
        }

        const plots = [] as Array<uPlot>;

        for (let i = 0; i < visualizations.length; ++i) {
            const visualization = visualizations[i];
            const { title, inputs, cursor, height } = visualization;
            const data = []; // uPlot data
            const series = []; // uPlot series
            console.log("Processing visualization", i);
            for (let j = 0; j < inputs.length; ++j) {
                const { data: dataPathStr, width, ...otherInputs } = inputs[j];
                const dataPath = dataPathStr.split(".");
                // extract the data based on the input datapath
                const dataset = datasets[+dataPath[0]];
                if (!dataset) {
                    setErrorMsgs((existingMsgs) => [
                        ...existingMsgs,
                        `Unable to access ${dataPathStr} because dataset ${dataPath[0]} is not available!`,
                    ]);
                    continue;
                }
                data[j] = dataset.parsed.data.map(
                    (row) => +(row as { [n: string]: number })[dataPath[1]]
                );
                series[j] = {
                    width: width ? width / devicePixelRatio : undefined,
                    ...otherInputs,
                };
            }
            const opts = {
                title,
                cursor,
                width: window.innerWidth,
                height,
                scales: {
                    x: {
                        time: false,
                    },
                },
                series,
            };

            const plotContainer = document.getElementById(`plot-${i}`);

            if (!plotContainer) {
                setErrorMsgs((existingMsgs) => [
                    ...existingMsgs,
                    `Plot container not found for plot-${i}`,
                ]);
                return;
            }

            plots.push(new uPlot(opts, data, plotContainer));
        }

        return () => {
            plots.forEach((plot) => plot.destroy());
        };
    }, [datasets, visualizations]);

    function handleAddDataset() {
        setErrorMsgs([]);

        const files = fileInput.current?.files;
        if (!files || files.length === 0) {
            setErrorMsgs((existingMsgs) => [...existingMsgs, "No files are selected."]);
            return;
        }
        for (let i = 0; i < files.length; ++i) {
            const file = files[i];
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                error: function parsingError(err, file) {
                    setErrorMsgs((existingMsgs) => [
                        ...existingMsgs,
                        `Error parsing "${file?.name}". Reason: ${err.message}. Please see console for more details.`,
                    ]);
                    console.error(err, file);
                },
                complete: function parsingComplete(results, file) {
                    if (results.errors.length) {
                        setErrorMsgs((existingMsgs) => [
                            ...existingMsgs,
                            `Parsing "${file?.name}" resulted in errors. Please see console for more details`,
                        ]);
                        console.error(
                            "Parsing complete but contains errors:",
                            "file:",
                            file,
                            "results:",
                            results
                        );
                    } else {
                        console.log("Parsing complete!", "file:", file, "results:", results);
                    }

                    setDatasets((existingDatasets) => [
                        ...existingDatasets,
                        { file, parsed: results },
                    ]);
                },
            });
        }
    }

    function handleApplyRawConfig() {
        const rawConfigStr = rawConfig.current?.value;
        if (!rawConfigStr) {
            setErrorMsgs((existingMsgs) => [...existingMsgs, "Invalid config!"]);
            return;
        }

        try {
            setVisualizations(JSON.parse(rawConfigStr).visualizations);
        } catch (error) {
            setErrorMsgs((existingMsgs) => [
                ...existingMsgs,
                "Error applying config. Please see console for more info",
            ]);
            console.error("Error applying config:", error);
        }
    }

    return (
        <div className="App">
            <div className="Content">
                <h1>WATORACE Data Visualizer</h1>
                {errorMsgs.map((msg, idx) => (
                    <p key={idx} className="error-message">
                        {msg}
                    </p>
                ))}
                <p>{datasets.length} Dataset(s)</p>
                <ol start={0}>
                    {datasets.map((dataset, idx) => (
                        <li key={idx}>{dataset.file?.name}</li>
                    ))}
                </ol>
                <input type="file" ref={fileInput} multiple />
                <button onClick={handleAddDataset}>Add Dataset</button>
                {visualizations.map((visualization, idx) => (
                    <div key={idx}>
                        <p>{visualization.title}</p>
                        <div id={`plot-${idx}`} />
                    </div>
                ))}

                <h2>Raw Configuration</h2>
                <p>
                    This <code>textarea </code> contains the raw configuration that generates the
                    graphs above. You can copy the text below and share with others. You can also
                    apply new configurations by replacing the text below and clicking "Apply
                    configuration".
                </p>
                <textarea id="raw-config" ref={rawConfig}>
                    {JSON.stringify({ visualizations }, null, 2)}
                </textarea>
                <br />
                <button onClick={handleApplyRawConfig}>Apply Configuration</button>
            </div>

            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <p>WATORACE Data Visualizer</p>
                <p>
                    Edit <code>src/App.tsx</code> and save to reload.
                </p>
                <a
                    className="App-link"
                    href="https://reactjs.org"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Learn React
                </a>
            </header>
        </div>
    );
}

export default App;
