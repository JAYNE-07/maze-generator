# Theme Maze Book Generator

Generate printable maze books in any theme — type a keyword (`animals`, `food`,
`vehicles`, `space`…), get a book of 1–500 mazes where every page is a
different on-theme shape with cartoon start/end markers.

Free shapes & cartoons via [Pollinations.ai](https://pollinations.ai) (no
key), iconify fallback, in-browser PDF/PNG/ZIP export. Pages sized for 5×8″,
6×9″, or A4 trim.

**Live site:** https://jayne-07.github.io/maze-generator/

## Run locally

```sh
npm install
npm run dev      # http://localhost:5173/
npm run build    # production bundle in dist/
npm run preview  # preview the production build
```

## Keyword list

See `maze-keywords.csv` for the 165 canonical keywords (every one yields ≥101
distinct on-theme shapes for a no-repeat 101-maze book), plus all the
synonyms that map to each theme.
