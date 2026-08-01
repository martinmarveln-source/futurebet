import 'dotenv/config';
import Papa from 'papaparse';

const SHEET_ID = "1vMva92Yesm1YiJeC8_1mBqb2KtTv31ByaCuJK2B9qeY";
const SHEET_NAME = "Picks";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

console.log("Fetching matches sheet...");
const res = await fetch(CSV_URL);
const text = await res.text();
const parsed = Papa.parse(text, { skipEmptyLines: true });

console.log("Total rows:", parsed.data.length);
console.log("Number of columns:", parsed.data[0]?.length);
console.log("First row (header):", JSON.stringify(parsed.data[0]));
console.log("Second row (sample):", JSON.stringify(parsed.data[1]));
