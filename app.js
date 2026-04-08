(function () {
  "use strict";

  var e = React.createElement;
  var HashRouter = ReactRouterDOM.HashRouter;
  var NavLink = ReactRouterDOM.NavLink;
  var Navigate = ReactRouterDOM.Navigate;
  var Route = ReactRouterDOM.Route;
  var Routes = ReactRouterDOM.Routes;

  var NAV_ITEMS = [
    { to: "/", label: "Quote", framePath: "public/legacy/quote/index.html", title: "Quote Tool" },
    { to: "/itinerary", label: "Itinerary", framePath: "public/legacy/itinerary_planner/index.html", title: "Itinerary" },
    { to: "/hotel-maker", label: "Hotel Maker", framePath: "public/legacy/hotel_maker/index.html", title: "Hotel Maker" },
    { to: "/gds-parser", label: "GDS Parser", framePath: "public/legacy/gds_parser/gds_parser.html", title: "GDS Parser" },
    { to: "/manual", label: "Manual", framePath: "public/legacy/manual/index.html", title: "Manual" },
    { to: "/itinerary-legacy", label: "Itinerary Legacy", framePath: "public/legacy/itinerary_planner/index.html", title: "Itinerary Legacy" },
    { to: "/hotel-maker-legacy", label: "Hotel Legacy", framePath: "public/legacy/hotel_maker/index.html", title: "Hotel Legacy" }
  ];

  function basePath() {
    var pathname = window.location.pathname || "/";
    if (!pathname.endsWith("/")) {
      pathname = pathname.slice(0, pathname.lastIndexOf("/") + 1);
    }
    return pathname;
  }

  function joinPath(path) {
    var clean = path.charAt(0) === "/" ? path.slice(1) : path;
    return basePath() + clean;
  }

  function ToolFrame(props) {
    return e(
      "section",
      { className: "tool-frame-wrap", "aria-label": props.title },
      e("iframe", {
        className: "tool-frame",
        src: joinPath(props.path),
        title: props.title,
        loading: "eager",
        referrerPolicy: "no-referrer"
      })
    );
  }

  function Header() {
    return e(
      "header",
      { className: "top-bar" },
      e(
        "div",
        { className: "brand" },
        e("h1", null, "Invoice Dev"),
        e("p", null, "Workspace")
      ),
      e(
        "nav",
        { "aria-label": "Primary" },
        e(
          "ul",
          { className: "nav-list" },
          NAV_ITEMS.map(function (item) {
            return e(
              "li",
              { key: item.to },
              e(
                NavLink,
                {
                  to: item.to,
                  end: item.to === "/",
                  className: function (state) {
                    return state.isActive ? "nav-link active" : "nav-link";
                  }
                },
                item.label
              )
            );
          })
        )
      )
    );
  }

  function App() {
    return e(
      HashRouter,
      null,
      e(
        "div",
        { className: "app-shell" },
        e(Header),
        e(
          "main",
          { className: "page-content" },
          e(
            Routes,
            null,
            NAV_ITEMS.map(function (item) {
              return e(Route, {
                key: item.to,
                path: item.to,
                element: e(ToolFrame, { path: item.framePath, title: item.title })
              });
            }),
            e(Route, { path: "*", element: e(Navigate, { to: "/", replace: true }) })
          )
        )
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
