import React, {useEffect, useRef, useState} from 'react';
import logo from './logo.svg';
import './App.css';
import Papa, {ParseResult as PapaParseResult} from 'papaparse';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

function App() {
  const fileInput = useRef(null as (HTMLInputElement|null));
  const [errorMsgs, setErrorMsgs] = useState([] as Array<string>);
  const [datasets, setDatasets] = useState([] as Array<{file: File | undefined, parsed: PapaParseResult<unknown>}>);

  // plot datasets on change (rerender of the react component)
  useEffect(() => {
    if (datasets.length === 0) {
      return;
    }
    const idx = 0
    const dataset = datasets[idx];
    const data = [];
    data[0] = dataset.parsed.data.map(row => +(row as any).TimeOfUpdate);
    data[1] = dataset.parsed.data.map(row => +(row as any).SteeringWheelAngle);

    const opts = {
					title: "Steering over time (rad)",
					width: 1920,
          height: 600,
          scales: {
            x: {
              time: false
            }
          },
					series: [
						{
              label: "time (s)"
            },
						{
							label: "Steering Wheel Angle (rad)",
							value: (self: any, rawValue: any) => rawValue.toFixed(2),
							stroke: "red",
							width: 1/devicePixelRatio,
						},
					],
					axes: [
						{},
						{
							values: (u: any, vals: Array<number>, space: any) => vals.map(v => +v.toFixed(2)),
						},
					],
        };
        
        const plotContainer = document.getElementById(`plot-${idx}`);

        if (!plotContainer) {
          // TODO: Fix react error when using setErrorMsgs in effect
          // setErrorMsgs(existingMsgs => [...existingMsgs, `Plot container not found for plot-${idx}`]);
          return;
        }

				let uplot = new uPlot(opts, data, plotContainer);
  });

  function handleAddDataset() {
    setErrorMsgs([]);

    const files = fileInput.current?.files;
    if (!files || files.length === 0) {
      setErrorMsgs(existingMsgs => [...existingMsgs, "No files are selected."]);
      return;
    }
    for (let i = 0; i < files.length; ++i) {
      const file = files[i];
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        error: function parsingError(err, file) {
          setErrorMsgs(existingMsgs => [...existingMsgs, `Error parsing "${file?.name}". Reason: ${err.message}. Please see console for more details.`]);
          console.error(err, file);
        },
        complete: function parsingComplete(results, file) {
          if (results.errors.length) {
            setErrorMsgs(existingMsgs => [...existingMsgs, `Parsing "${file?.name}" resulted in errors. Please see console for more details`]);
            console.error("Parsing complete but contains errors:", "file:", file, "results:", results);
          } else {
            console.log("Parsing complete!", "file:", file, "results:", results);
          }

          setDatasets(existingDatasets => [...existingDatasets, {file, parsed: results}]);
        }
      });
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        { errorMsgs.map((msg, idx) => <p key={idx} className="error-message">{msg}</p>) }
        <p>{datasets.length} Dataset(s)</p>
        <ol>
          { datasets.map((dataset, idx) => <li key={idx}>{dataset.file?.name}</li>) }
        </ol>
        <input type="file" ref={fileInput} multiple />
        <button onClick={handleAddDataset}>Add Dataset</button>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
      { datasets.map((dataset, idx) => (
          <div key={idx}>
            <p>{dataset.file?.name}</p>
            <div id={`plot-${idx}`}/>
          </div>
        ))
      }
    </div>
  );
}

export default App;
