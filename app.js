const fileInput = document.getElementById("fileInput");
const uploadBox = document.querySelector(".upload-box");
const cleanButton = document.getElementById("cleanButton");
const downloadButton = document.getElementById("downloadButton");
const status = document.getElementById("status");
const previewTable = document.getElementById("previewTable");

const trimSpaces = document.getElementById("trimSpaces");
const removeEmptyRows = document.getElementById("removeEmptyRows");
const removeDuplicates = document.getElementById("removeDuplicates");
const normalizeCase = document.getElementById("normalizeCase");
const columnsToDelete = document.getElementById("columnsToDelete");

let cleanedRows = [];
let cleanedFileName = "cleaned.csv";

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (insideQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function toCSV(rows) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? "");
          const needsQuotes =
            text.includes(",") ||
            text.includes('"') ||
            text.includes("\n") ||
            text.includes("\r");

          if (!needsQuotes) return text;
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");
}

function cleanRows(rawRows) {
  if (rawRows.length === 0) return [];

  let rows = rawRows.map((row) => [...row]);

  if (trimSpaces.checked) {
    rows = rows.map((row) => row.map((value) => String(value ?? "").trim()));
  }

  let headers = rows[0];

  if (normalizeCase.checked) {
    headers = headers.map((header) => String(header ?? "").toLowerCase());
    rows[0] = headers;
  }

  const deleteNames = columnsToDelete.value
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);

  if (deleteNames.length > 0) {
    const deleteIndexes = [];
    headers.forEach((header, index) => {
      if (deleteNames.includes(String(header).toLowerCase())) {
        deleteIndexes.push(index);
      }
    });

    if (deleteIndexes.length > 0) {
      rows = rows.map((row) =>
        row.filter((_, index) => !deleteIndexes.includes(index))
      );
    }
  }

  if (removeEmptyRows.checked) {
    rows = rows.filter((row, index) => {
      if (index === 0) return true;
      return row.some((value) => String(value ?? "").trim() !== "");
    });
  }

  if (removeDuplicates.checked) {
    const seen = new Set();
    rows = rows.filter((row, index) => {
      if (index === 0) return true;

      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return rows;
}

function renderPreview(rows) {
  previewTable.innerHTML = "";

  if (rows.length === 0) {
    previewTable.innerHTML =
      '<tr><td>No data to preview.</td></tr>';
    return;
  }

  const maxColumns = Math.max(...rows.map((row) => row.length));
  const headerRow = document.createElement("tr");

  for (let i = 0; i < maxColumns; i++) {
    const th = document.createElement("th");
    th.textContent = rows[0][i] ?? `Column ${i + 1}`;
    headerRow.appendChild(th);
  }

  previewTable.appendChild(headerRow);

  rows.slice(1, 26).forEach((row) => {
    const tr = document.createElement("tr");

    for (let i = 0; i < maxColumns; i++) {
      const td = document.createElement("td");
      td.textContent = row[i] ?? "";
      tr.appendChild(td);
    }

    previewTable.appendChild(tr);
  });
}

async function handleFiles(files) {
  const csvFiles = [...files].filter(
    (file) =>
      file.name.toLowerCase().endsWith(".csv") ||
      file.type === "text/csv"
  );

  if (csvFiles.length === 0) {
    status.textContent = "Please choose at least one .csv file.";
    return;
  }

  const allRows = [];

  for (const file of csvFiles) {
    const text = await file.text();
    const parsed = parseCSV(text);

    if (parsed.length > 0) {
      if (allRows.length === 0) {
        allRows.push(...parsed);
      } else {
        allRows.push(...parsed.slice(1));
      }
    }
  }

  cleanedRows = cleanRows(allRows);
  cleanedFileName =
    csvFiles.length === 1
      ? csvFiles[0].name.replace(/\.csv$/i, "") + "-cleaned.csv"
      : "cleaned-files.csv";

  status.textContent = `Processed ${csvFiles.length} file(s). ${Math.max(
    cleanedRows.length - 1,
    0
  )} data rows ready.`;

  renderPreview(cleanedRows);
  downloadButton.disabled = cleanedRows.length <= 1;
}

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    handleFiles(fileInput.files);
  }
});

uploadBox.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadBox.classList.add("dragover");
});

uploadBox.addEventListener("dragleave", () => {
  uploadBox.classList.remove("dragover");
});

uploadBox.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadBox.classList.remove("dragover");
  if (event.dataTransfer.files.length > 0) {
    handleFiles(event.dataTransfer.files);
  }
});

cleanButton.addEventListener("click", () => {
  if (fileInput.files.length > 0) {
    handleFiles(fileInput.files);
  } else {
    status.textContent = "Choose a CSV file first.";
  }
});

downloadButton.addEventListener("click", () => {
  const csv = toCSV(cleanedRows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = cleanedFileName;
  link.click();

  URL.revokeObjectURL(url);
});
