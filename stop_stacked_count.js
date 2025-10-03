const stop_count_tooltip = d3.select("body")
  .append("div").attr("class", "tooltip")
  .style("display", "none");

d3.json("./tables/yearly_stops_by_race.json").then(data => {
  const races = Array.from(new Set(data.map(d => d.Race)));
  const years = Array.from(new Set(data.map(d => d.Year))).sort((a, b) => a - b);

  const color = d3.scaleOrdinal()
    .domain(races)
    .range(d3.schemeCategory10);

  const chartDiv = d3.select("#stop-count-container");
  chartDiv.selectAll("*").remove();

  // Aggregate counts per year & race
  const nested = d3.group(data, d => d.Year);
  const stackedData = [];

  nested.forEach((records, Year) => {
    const obj = { Year: Year };
    let total = 0;
    races.forEach(Race => {
      const count = d3.sum(records.filter(r => r.Race === Race), d => d.Count);
      obj[Race] = count;
      total += count;
    });
    obj.Total = total;
    stackedData.push(obj);
  });

  const svg = chartDiv.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(years)
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(stackedData, d => races.reduce((sum, r) => sum + d[r], 0))])
    .nice()
    .range([height, 0]);

  const stack = d3.stack().keys(races.slice().reverse());
  const series = stack(stackedData);

  svg.selectAll("g.series")
    .data(series)
    .join("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", d => x(d.data.Year))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .on("mousemove", (event, d) => {
      const race = d3.select(event.currentTarget.parentNode).datum().key;
      const count = d.data[race];
      const percent = ((count / d.data.Total) * 100).toFixed(1);
      stop_count_tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 25) + "px")
        .style("display", "inline-block")
        .html(`<strong>${race}</strong>
               <br>Count: ${count}
               <br>Percent: ${percent}%`);
    })
    .on("mouseout", () => stop_count_tooltip.style("display", "none"));

  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d => "'" + String(d).slice(2)))
    .selectAll("text")
    .attr("font-size", "14px");

  // Y axis
  svg.append("g").call(d3.axisLeft(y));

  // Title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("Total Stops");

  // Legend
  const legendSvg = d3.select("#stop-count-legend");
  const padding = 10;

  const legendGroup = legendSvg.append("g").attr("id", "legendGroup");
  let xOffset = 0;

  races.forEach(Race => {
    const g = legendGroup.append("g")
      .attr("transform", `translate(${xOffset},0)`);

    g.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(Race));

    const text = g.append("text")
      .attr("x", 15)
      .attr("y", 7)
      .text(Race)
      .attr("font-size", "12px")
      .attr("dominant-baseline", "middle");

    const textWidth = text.node().getBBox().width;
    xOffset += 15 + 5 + textWidth + padding;
  });

  const svgWidth = legendSvg.node().clientWidth || +legendSvg.attr("width");
  const groupWidth = legendGroup.node().getBBox().width;

  legendGroup.attr("transform", `translate(${(svgWidth - groupWidth) / 2}, 0)`);
});
