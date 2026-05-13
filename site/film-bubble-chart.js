import * as d3 from "d3";
import { Era } from "./era.js";

const margin = { top: 16, right: 16, bottom: 20, left: 24 };

const border = 1;
const bordercolor = "black";

/**
 * Half-step indices 0..20 map to ratings 0, 0.5, …, 10.
 * Values are multipliers for `ratingIntervalW` in the original layout.
 */
const RATING_FORCE_X_INTERVAL_MULT = [
  2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7.5, 7.5, 2, 2, 4, 4, 6, 6, 8, 8, 9,
];

function ratingToHalfStepIndex(rating) {
  const r = Number(rating);
  if (!Number.isFinite(r)) return 0;
  return Math.min(20, Math.max(0, Math.round(r * 2)));
}

export class FilmBubbleChart {
  static parseRow(d) {
    return {
      title: d.title,
      yearOfRelease: +d.yearOfRelease,
      rating: +d.rating,
    };
  }

  /** @type {import("d3").Selection<HTMLElement, unknown, null, undefined> | null} */
  root = null;
  /** @type {import("d3").Selection<HTMLDivElement, unknown, HTMLElement, unknown> | null} */
  tooltip = null;
  /** @type {ReturnType<FilmBubbleChart["parseRow"]>[] | null} */
  datapoints = null;
  /** @type {Era | null} */
  era = null;

  layoutWidth = 400;
  layoutHeight = 300;
  /** @type {import("d3").ScalePower<number, number, never>} */
  radiusScale = d3.scaleSqrt().domain([0, 10]).range([1, 8]);

  /** @type {import("d3").Selection<SVGSVGElement, unknown, HTMLElement, unknown> | null} */
  svgRoot = null;
  /** @type {import("d3").Selection<SVGRectElement, unknown, SVGSVGElement, unknown> | null} */
  clip = null;
  /** @type {import("d3").Selection<SVGGElement, unknown, SVGSVGElement, unknown> | null} */
  plot = null;

  /** @type {import("d3").Simulation<ReturnType<FilmBubbleChart["parseRow"]>, undefined> | null} */
  simulation = null;
  /** @type {import("d3").Selection<SVGCircleElement, ReturnType<FilmBubbleChart["parseRow"]>, SVGGElement, unknown> | null} */
  circles = null;

  forceXSeparateDecade = null;
  forceYSeparateDecade = null;
  forceXSeparateRating = null;
  forceYSeparateRating = null;
  forceXCombine = null;
  forceYCombine = null;
  forceXEraFocus = null;
  forceYEraFocus = null;
  forceCollide = null;
  forceManyBody = null;

  /** Which layout is active after user clicks (resize must re-apply same mode). */
  layoutMode = "combine";

  /** Era index when {@link layoutMode} is `"eraFocus"` (legend split); otherwise `null`. */
  focusedEraIndex = null;

  /** @type {import("d3").Selection<HTMLDivElement, number, HTMLElement, unknown> | null} */
  legendSwatches = null;

  lastLayoutWidth;
  lastLayoutHeight;

  resizeTimer;

  constructor() {
    const csvPath = `${import.meta.env.BASE_URL}filme.csv`.replace(/\/{2,}/g, "/");
    d3.csv(csvPath, FilmBubbleChart.parseRow)
      .then((datapoints) => this.#onCsvReady(null, datapoints))
      .catch((err) => this.#onCsvReady(err, null));
  }

  #onCsvReady(error, datapoints) {
    this.root = d3.select("#chart-root");
    if (this.root.empty()) {
      console.error("Missing #chart-root container");
      return;
    }

    this.tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

    if (error || !datapoints || !datapoints.length) {
      console.error(error);
      this.root.append("p").attr("class", "data-error").text(
        "Could not load filme.csv. Add a CSV with columns: title, yearOfRelease, rating",
      );
      return;
    }

    this.datapoints = datapoints;
    const maxDataYear = d3.max(datapoints, (d) => d.yearOfRelease);
    const chartMaxYear = Math.max(maxDataYear, new Date().getFullYear());
    this.era = new Era(chartMaxYear);

    const colour = (d) => this.era.fillForYear(d.yearOfRelease);

    const legend = d3.select("#yearLegend");
    legend.selectAll("*").remove();
    legend
      .selectAll("div.year-swatch")
      .data(d3.range(this.era.count))
      .enter()
      .append("div")
      .attr("class", "year-swatch")
      .style("background-color", (i) => Era.swatchBackground(i))
      .style("color", (i) => Era.swatchForeground(i))
      .text((i) => Era.legendLabel(i));

    this.legendSwatches = legend.selectAll("div.year-swatch");
    this.legendSwatches
      .attr("role", "button")
      .attr("tabindex", 0)
      .attr("aria-pressed", "false")
      .attr("aria-label", (i) => `Isolate ${Era.legendLabel(i)} on the right; other eras on the left. Press again to group at center.`)
      .on("click", (event, i) => {
        event.preventDefault();
        this.#onLegendEraClick(i);
      })
      .on("keydown", (event, i) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.#onLegendEraClick(i);
        }
      });

    this.svgRoot = this.root.append("svg").attr("class", "chart-svg").attr("role", "img");

    const defs = this.svgRoot.append("defs");
    this.clip = defs.append("clipPath").attr("id", "chart-clip-inner").append("rect").attr("x", 0).attr("y", 0);

    const g = this.svgRoot
      .append("g")
      .attr("class", "chart-inner")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    this.plot = g.append("g").attr("clip-path", "url(#chart-clip-inner)");

    this.plot
      .append("rect")
      .attr("class", "chart-border")
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", "none")
      .style("stroke", bordercolor)
      .style("stroke-width", border);

    this.applyLayout();

    this.simulation = d3
      .forceSimulation()
      .velocityDecay(0.44)
      .alphaMin(0.001)
      .alphaTarget(0)
      .force("charge", this.forceManyBody)
      .force("x", this.forceXCombine)
      .force("y", this.forceYCombine)
      .force("collide", this.forceCollide);

    this.simulation.on("end", () => {
      datapoints.forEach((d) => {
        d.vx = 0;
        d.vy = 0;
      });
    });

    this.circles = this.plot
      .selectAll(".filme")
      .data(datapoints)
      .enter()
      .append("circle")
      .attr("class", "filme")
      .attr("r", (d) => this.radiusScale(d.rating))
      .attr("fill", colour)
      .on("click", function (event, d) {
        console.log(d);
      })
      .on("mouseover", (event, d) => {
        this.tooltip.transition().duration(200).style("opacity", 0.9);
        this.tooltip
          .html(d.title + "<br/>" + d.yearOfRelease + "<br/>" + d.rating)
          .style("left", event.pageX + "px")
          .style("top", event.pageY + "px")
          .style("transform", "translate(-50%, calc(-100% - 10px))");
      })
      .on("mouseout", () => {
        this.tooltip.transition().duration(500).style("opacity", 0);
      });

    datapoints.forEach((d) => {
      d.x = this.layoutWidth / 2 + (Math.random() - 0.5) * this.layoutWidth * 0.2;
      d.y = this.layoutHeight / 2 + (Math.random() - 0.5) * this.layoutHeight * 0.2;
      this.clampNode(d);
    });

    this.simulation.nodes(datapoints).on("tick", () => this.ticked());

    d3.select("#splitD").on("click", () => {
      this.layoutMode = "decade";
      this.focusedEraIndex = null;
      this.#updateLegendFocusStyles();
      this.simulation.force("x", this.forceXSeparateDecade).force("y", this.forceYSeparateDecade);
      this.reheatSimulation();
    });

    d3.select("#splitR").on("click", () => {
      this.layoutMode = "rating";
      this.focusedEraIndex = null;
      this.#updateLegendFocusStyles();
      this.simulation.force("x", this.forceXSeparateRating).force("y", this.forceYSeparateRating);
      this.reheatSimulation();
    });

    d3.select("#combine").on("click", () => {
      this.layoutMode = "combine";
      this.focusedEraIndex = null;
      this.#updateLegendFocusStyles();
      this.simulation.force("x", this.forceXCombine).force("y", this.forceYCombine);
      this.reheatSimulation();
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.applyLayout());
    });

    window.addEventListener("resize", () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.applyLayout(), 120);
    });

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => this.applyLayout(), 80);
      });
      ro.observe(this.root.node());
    }
  }

  #onLegendEraClick(eraIndex) {
    if (!this.simulation) return;
    if (this.layoutMode === "eraFocus" && this.focusedEraIndex === eraIndex) {
      this.layoutMode = "combine";
      this.focusedEraIndex = null;
      this.rebuildForces();
      this.simulation.force("charge", this.forceManyBody).force("collide", this.forceCollide);
      this.simulation.force("x", this.forceXCombine).force("y", this.forceYCombine);
      this.reheatSimulation();
      this.#updateLegendFocusStyles();
      return;
    }
    this.layoutMode = "eraFocus";
    this.focusedEraIndex = eraIndex;
    this.rebuildForces();
    this.simulation.force("charge", this.forceManyBody).force("collide", this.forceCollide);
    this.simulation.force("x", this.forceXEraFocus).force("y", this.forceYEraFocus);
    this.reheatSimulation();
    this.#updateLegendFocusStyles();
  }

  #updateLegendFocusStyles() {
    if (!this.legendSwatches) return;
    const active = this.layoutMode === "eraFocus" && this.focusedEraIndex != null;
    const f = this.focusedEraIndex;
    this.legendSwatches
      .classed("year-swatch--focused", (i) => active && i === f)
      .attr("aria-pressed", (i) => (active && i === f ? "true" : "false"));
  }

  /** Reheat simulation after a layout / mode change (no perpetual alphaTarget). */
  reheatSimulation() {
    if (!this.simulation) return;
    const n = this.datapoints.length;
    const heat = Math.min(1, 0.48 + 2400 / (n + 200));
    this.simulation.alphaTarget(0).alpha(heat).restart();
  }

  layoutSize() {
    const el = this.root.node();
    const r = el.getBoundingClientRect();
    const outerW = Math.max(120, Math.floor(r.width) || el.clientWidth || window.innerWidth);
    const outerH = Math.max(
      180,
      Math.floor(r.height) || el.clientHeight || Math.floor(window.innerHeight * 0.5),
    );
    const innerW = Math.max(160, outerW - margin.left - margin.right);
    const innerH = Math.max(160, outerH - margin.top - margin.bottom);
    return { outerW, outerH, width: innerW, height: innerH };
  }

  updateRadiusScale() {
    const s = Math.min(this.layoutWidth, this.layoutHeight);
    // Taper bubble size on small panels (phones): same sqrt scale, tighter range.
    const t = Math.min(1, Math.max(0, (s - 280) / 420));
    const mult = 0.012 + t * (0.035 - 0.012);
    const maxCap = 5 + t * (14 - 5);
    const minR = 0.55 + t * (1 - 0.55);
    const rawMax = s * mult;
    const maxR = Math.min(maxCap, Math.max(minR * 2.5, rawMax));
    this.radiusScale = d3.scaleSqrt().domain([0, 10]).range([minR, maxR]);
  }

  rebuildForces() {
    const denom = Math.max(1, this.era.count - 1);
    const posStrength = 0.086;
    const bodyStrength = -Math.min(0.55, 0.1 + this.datapoints.length / 7000);

    const { layoutWidth: width, layoutHeight: height } = this;

    this.forceManyBody = d3.forceManyBody().strength(bodyStrength).theta(0.92);

    this.forceXSeparateDecade = d3
      .forceX((d) => {
        const i = Era.index(d.yearOfRelease);
        return width * 0.06 + (i / denom) * (width * 0.88);
      })
      .strength(posStrength);

    const ratingIntervalW = width / 11;

    this.forceXSeparateRating = d3
      .forceX((d) => {
        const mult = RATING_FORCE_X_INTERVAL_MULT[ratingToHalfStepIndex(d.rating)];
        return ratingIntervalW * mult;
      })
      .strength(posStrength);

    const ratingIntervalH = height / 3;

    this.forceYSeparateRating = d3
      .forceY((d) => {
        const r = Number(d.rating);
        const band = Number.isFinite(r) && r >= 6 ? 2 : 1;
        return ratingIntervalH * band;
      })
      .strength(posStrength);

    this.forceYSeparateDecade = d3
      .forceY((d) => {
        const i = Era.index(d.yearOfRelease);
        const wave = (i % 3) - 1;
        return height * 0.18 + (i / denom) * (height * 0.64) + wave * (height * 0.06);
      })
      .strength(posStrength);

    this.forceXCombine = d3.forceX(width / 2).strength(posStrength);
    this.forceYCombine = d3.forceY(height / 2).strength(posStrength);

    const focusIdx = this.focusedEraIndex ?? -1;
    const leftX = width * 0.28;
    const rightX = width * 0.72;
    this.forceXEraFocus = d3
      .forceX((d) => (Era.index(d.yearOfRelease) === focusIdx ? rightX : leftX))
      .strength(posStrength);
    this.forceYEraFocus = d3.forceY(height / 2).strength(posStrength);

    this.forceCollide = d3
      .forceCollide((d) => this.radiusScale(d.rating) + 0.5)
      .iterations(4);
  }

  clampNode(d) {
    const r = this.radiusScale(d.rating) + 0.5;
    d.x = Math.max(r, Math.min(this.layoutWidth - r, d.x ?? this.layoutWidth / 2));
    d.y = Math.max(r, Math.min(this.layoutHeight - r, d.y ?? this.layoutHeight / 2));
  }

  applyLayout() {
    const L = this.layoutSize();
    const unchanged =
      this.simulation != null &&
      this.lastLayoutWidth === L.width &&
      this.lastLayoutHeight === L.height;
    if (unchanged) {
      return;
    }
    this.lastLayoutWidth = L.width;
    this.lastLayoutHeight = L.height;
    this.layoutWidth = L.width;
    this.layoutHeight = L.height;

    this.updateRadiusScale();

    this.svgRoot.attr("width", L.outerW).attr("height", L.outerH);

    this.clip.attr("width", this.layoutWidth).attr("height", this.layoutHeight);

    this.plot.select(".chart-border").attr("width", this.layoutWidth).attr("height", this.layoutHeight);

    this.rebuildForces();

    if (this.simulation) {
      this.simulation.force("charge", this.forceManyBody).force("collide", this.forceCollide);
      if (this.layoutMode === "combine") {
        this.simulation.force("x", this.forceXCombine).force("y", this.forceYCombine);
      } else if (this.layoutMode === "decade") {
        this.simulation.force("x", this.forceXSeparateDecade).force("y", this.forceYSeparateDecade);
      } else if (this.layoutMode === "rating") {
        this.simulation.force("x", this.forceXSeparateRating).force("y", this.forceYSeparateRating);
      } else if (this.layoutMode === "eraFocus") {
        this.simulation.force("x", this.forceXEraFocus).force("y", this.forceYEraFocus);
      }
      this.reheatSimulation();
    }

    if (this.circles) {
      this.circles.attr("r", (d) => this.radiusScale(d.rating));
    }
  }

  ticked() {
    this.datapoints.forEach((d) => this.clampNode(d));
    this.circles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  }
}

new FilmBubbleChart();
