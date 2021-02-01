import React, { useState, useRef } from "react";
import { FormControl, ListGroup } from "react-bootstrap";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";

function FilterList<T>({ list, height }: { list: Array<T>; height: string }) {
    const [filteredList, setFilteredList] = useState(list);
    const searchBox = useRef(null as HTMLInputElement | null);

    function handleFilterItems() {
        const needle = searchBox.current?.value;
        if (needle != null) {
            setFilteredList(
                list.filter((v) => String(v).toLowerCase().includes(needle.toLowerCase()))
            );
        }
    }

    return (
        <div>
            <FormControl placeholder="Search" onChange={handleFilterItems} ref={searchBox} />
            <ListGroup style={{ height }}>
                <AutoSizer>
                    {({ height, width }) => (
                        <FixedSizeList
                            width={width}
                            height={height}
                            itemSize={50}
                            itemCount={filteredList.length}
                        >
                            {({ index, style }) => (
                                <ListGroup.Item style={style}>{filteredList[index]}</ListGroup.Item>
                            )}
                        </FixedSizeList>
                    )}
                </AutoSizer>
            </ListGroup>
        </div>
    );
}

export default FilterList;
