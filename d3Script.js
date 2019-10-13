var margin = {top: 20 ,  right: 20, bottom: 30, left: 40},
width = screen.width - margin.left - margin.right,
height = screen.height - margin.top - margin.bottom;

var border=1;
var bordercolor='black';

(function(){

  var svg = d3.select(".Aligner")
  .append("svg")
  .attr("height", height + margin.top + margin.bottom)
  .attr("width", width + margin.left + margin.right)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
  .attr("border",border);

  svg.append("rect")
  .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "lightgrey")
    .style("stroke", bordercolor)
    .style("fill", "none")
    .style("stroke-width", border);

  var radiusScale = d3.scaleSqrt().domain([0,10]).range([1,10])

  var colour = function(d){
    if(d.yearOfRelease <= 1950){
      return "#910080"
    } else if(d.yearOfRelease <= 1959 && d.yearOfRelease >= 1950){
      return "#FF0002"
    } else if(d.yearOfRelease <= 1969 && d.yearOfRelease >= 1960){
      return "#FF7C00"
    } else if(d.yearOfRelease <= 1979 && d.yearOfRelease >= 1970){
      return "#FFF600"
    } else if(d.yearOfRelease <= 1989 && d.yearOfRelease >= 1980){
      return "#C5E000"
    } else if(d.yearOfRelease <= 1999 && d.yearOfRelease >= 1990){
      return "#5EC418"
    } else if(d.yearOfRelease <= 2009 && d.yearOfRelease >= 2000){
      return "#00A0F3"
    } else if(d.yearOfRelease >= 2010){
      return "#222183"
    }
  }

  var forceXSeparateDecade = d3.forceX(function(d){
    if(d.yearOfRelease <= 1950){
      return width / 2 - 400
    } else if(d.yearOfRelease <= 1959 && d.yearOfRelease >= 1950){
      return width / 2 - 400
    } else if(d.yearOfRelease <= 1969 && d.yearOfRelease >= 1960){
      return width / 2 - 100
    } else if(d.yearOfRelease <= 1979 && d.yearOfRelease >= 1970){
      return width / 2 + 100
    } else if(d.yearOfRelease <= 1989 && d.yearOfRelease >= 1980){
      return width / 2 + 400
    } else if(d.yearOfRelease <= 1999 && d.yearOfRelease >= 1990){
      return width / 2 + 400
    } else if(d.yearOfRelease <= 2009 && d.yearOfRelease >= 2000){
      return width / 2 + 150
    } else if(d.yearOfRelease >= 2010){
      return width / 2 - 150
    }
  }).strength(0.1)

  var ratingIntervalW = width / 11;

  var forceXSeparateRating = d3.forceX(function(d){
    if(d.rating == 0.0 || d.rating == 0.5){
      return 0 + ratingIntervalW*2
    } else if(d.rating == 1.0 || d.rating == 1.5){
      return 0 + ratingIntervalW*3
    } else if(d.rating == 2.0 || d.rating == 2.5){
      return 0 + ratingIntervalW*4
    } else if(d.rating == 3.0 || d.rating == 3.5){
      return  0 + ratingIntervalW*5
    } else if(d.rating == 4.0 || d.rating == 4.5){
      return  0 + ratingIntervalW*6
    } else if(d.rating == 5.0 || d.rating == 5.5){
      return  0 + ratingIntervalW*7.5
    } else if(d.rating == 6.0 || d.rating == 6.5){
      return  0 + ratingIntervalW*2
    } else if(d.rating == 7.0 || d.rating == 7.5){
      return  0 + ratingIntervalW*4
    } else if(d.rating == 8.0 || d.rating == 8.5){
      return  0 + ratingIntervalW*6
    } else if(d.rating == 9.0 || d.rating == 9.5){
      return  0 + ratingIntervalW*8
    } else if(d.rating == 10.0){
      return 0 + ratingIntervalW*9
    }
  }).strength(0.1)

  var ratingIntervalH = height / 3;

  var forceYSeparateRating = d3.forceY(function(d){
    if(d.rating == 0.0 || d.rating == 0.5){
      return 0 + ratingIntervalH
    } else if(d.rating == 1.0 || d.rating == 1.5){
      return 0 + ratingIntervalH
    } else if(d.rating == 2.0 || d.rating == 2.5){
      return 0 + ratingIntervalH
    } else if(d.rating == 3.0 || d.rating == 3.5){
      return  0 + ratingIntervalH
    } else if(d.rating == 4.0 || d.rating == 4.5){
      return  0 + ratingIntervalH
    } else if(d.rating == 5.0 || d.rating == 5.5){
      return  0 + ratingIntervalH
    } else if(d.rating == 6.0 || d.rating == 6.5){
      return  0 + ratingIntervalH*2
    } else if(d.rating == 7.0 || d.rating == 7.5){
      return  0 + ratingIntervalH*2
    } else if(d.rating == 8.0 || d.rating == 8.5){
      return  0 + ratingIntervalH*2
    } else if(d.rating == 9.0 || d.rating == 9.5){
      return  0 + ratingIntervalH*2
    } else if(d.rating == 10.0){
      return 0 + ratingIntervalH*2
    }
  }).strength(0.1)

  var forceYSeparateDecade = d3.forceY(function(d){
    if(d.yearOfRelease <= 1950){
      return height / 2 + 150
    } else if(d.yearOfRelease <= 1959 && d.yearOfRelease >= 1950){
      return height / 2 - 150
    } else if(d.yearOfRelease <= 1969 && d.yearOfRelease >= 1960){
      return height / 2 - 300
    } else if(d.yearOfRelease <= 1979 && d.yearOfRelease >= 1970){
      return height / 2 - 300
    } else if(d.yearOfRelease <= 1989 && d.yearOfRelease >= 1980){
      return height / 2 - 150
    } else if(d.yearOfRelease <= 1999 && d.yearOfRelease >= 1990){
      return height / 2 + 150
    } else if(d.yearOfRelease <= 2009 && d.yearOfRelease >= 2000){
      return height / 2 + 300
    } else if(d.yearOfRelease >= 2010){
      return height / 2 + 300
    }
  }).strength(0.1)

  var forceXCombine = d3.forceX(width / 2).strength(0.1)
  var forceYCombine = d3.forceY(height / 2).strength(0.1)


  var forceCollide = d3.forceCollide(function(d){
    return radiusScale(d.rating) + 1
  })

  var simulation = d3.forceSimulation()
    .force("x", forceXCombine)
    .force("y", forceYCombine)
    .force("collide", forceCollide)

  var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  d3.queue()
  .defer(d3.csv, "filme.csv")
  .await(ready)

  function ready (error, datapoints) {
      var circles = svg.selectAll(".filme")
      .data(datapoints)
      .enter().append("circle")
      .attr("class", "filme")
      .attr("r", function(d){
        return radiusScale(d.rating)
      })
      .attr("r", 5)
      .attr("fill", colour)
      .on('click', function(d){
        console.log(d)
      })
      .on("mouseover", function(d) {
          div.transition()
              .duration(200)
              .style("opacity", .9);
          div.html(d.title + "<br/>"  + d.yearOfRelease + "<br/>"  + d.rating)
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
          })
      .on("mouseout", function(d) {
          div.transition()
              .duration(500)
              .style("opacity", 0);
      });


      d3.select("#splitD").on('click', function(){
        simulation
          .force("x", forceXSeparateDecade)
          .force("y", forceYSeparateDecade)
          .alphaTarget(0.1)
          .restart()
      })

      d3.select("#splitR").on('click', function(){
        simulation
          .force("x", forceXSeparateRating)
          .force("y", forceYSeparateRating)
          .alphaTarget(0.1)
          .restart()
      })

      d3.select("#combine").on('click', function(){
        simulation
          .force("x", forceXCombine)
          .force("y", forceYCombine)
          .alphaTarget(0.1)
          .restart()
      })

      simulation.nodes(datapoints)
        .on('tick', ticked)

      function ticked(){
        circles
          .attr("cx", function(d){
            return d.x
          })
          .attr("cy", function(d){
            return d.y
          })
      }
  }

})();
