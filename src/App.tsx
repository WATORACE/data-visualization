import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import logo from "./logo.svg";
import "./App.css";
import Papa, { ParseResult as PapaParseResult } from "papaparse";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { Table, Container, Modal, Button } from "react-bootstrap";
import FilterList from "./FilterList";

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
                    label: "cdgSpeed_x (m/s)",
                    stroke: "blue",
                    width: 1,
                    data: "0.cdgSpeed_x",
                },
                {
                    label: "cdgSpeed_y (m/s)",
                    stroke: "green",
                    width: 1,
                    data: "0.cdgSpeed_y",
                },
            ],
        },
    ]);

    const [datasetModalID, setDatasetModalID] = useState(-1);

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
                    console.error(`Error Parsing ${file?.name}! Error:`, err, "file:", file);
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
                <Container>
                    <h1>WATORACE Data Visualizer</h1>
                    <p>This is pre-alpha software.</p>
                    <p>
                        Select a vehicleOutput csv and click "Add Dataset" to view the current
                        functionalities. You can safely ignore the initial errors due to dataset 0
                        being not available.
                    </p>
                    {errorMsgs.map((msg, idx) => (
                        <p key={idx} className="error-message">
                            {msg}
                        </p>
                    ))}
                    <p>{datasets.length} Dataset(s)</p>
                    <Table bordered hover striped>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Dataset Name</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datasets.map((dataset, idx) => (
                                <tr>
                                    <td className="align-middle">{idx}</td>
                                    <td className="align-middle">{dataset.file?.name}</td>
                                    <td>
                                        <Button size="sm" onClick={() => setDatasetModalID(idx)}>
                                            More Info
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                    <input type="file" ref={fileInput} multiple />
                    <button onClick={handleAddDataset}>Add Dataset</button>
                </Container>
                {visualizations.map((visualization, idx) => (
                    <div key={idx} className="plot">
                        <div id={`plot-${idx}`} />
                    </div>
                ))}

                <Container>
                    <h2>Raw Configuration</h2>
                    <p>
                        This <code>&lt;textarea/&gt;</code> contains the raw configuration that
                        generates the graphs above. You can copy the text below and share with
                        others. You can also apply new configurations by replacing the text below
                        and clicking "Apply configuration".
                    </p>
                    <textarea id="raw-config" ref={rawConfig}>
                        {JSON.stringify({ visualizations }, null, 4)}
                    </textarea>
                    <br />
                    <button onClick={handleApplyRawConfig}>Apply Configuration</button>
                </Container>
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

            <Modal
                show={datasetModalID >= 0}
                onHide={() => setDatasetModalID(-1)}
                dialogClassName="dataset-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>{datasets[datasetModalID]?.file?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Fields:
                    <FilterList
                        list={datasets[datasetModalID]?.parsed.meta.fields || []}
                        height="60vh"
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setDatasetModalID(-1)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default App;
