# Product Excel import

In Product management, **Import Excel** uploads an `.xlsx` or `.xls` file to
`POST /api/products/import`. Only administrators can import. The upload limit is
5 MB; there is no 5,600-row limit.

The importer reads the first worksheet. Its first non-empty row must contain
column headers. It reads the item code, description and other fields from the
same physical Excel row. Blank rows are ignored, and reported row numbers still
match Excel. The response and the on-screen report identify the worksheet used.

Required columns are **Item Code**, **Description** and **Unit**. **Default Unit**
and **UoM** also mean Unit, so files from **Download Excel** can be imported.
Header matching ignores case, whitespace, underscores and hyphens. Two columns
that match the same field are rejected because their meaning is ambiguous.

Optional columns are Category, Barcode, Perishable (or isPerishable), Minimum
Stock, Reorder Level and Notes. Categories and units must already exist. Unit
names and short names are accepted. Stock thresholds must be nonnegative numbers.

Descriptions retain their original letter case, punctuation, Unicode characters
and internal line breaks. Leading and trailing whitespace is trimmed. Item codes
are trimmed and converted to uppercase. Text codes retain leading zeros; numeric
zero-padding is preserved when it represents the full number. Rounded/scientific
number formats use the underlying numeric value to avoid combining different
codes. Literal prefixes and separators are retained when their digits are intact;
unsupported number formats fail the row and should be converted to text codes.
Store long identifiers as text in Excel: digits already rounded by Excel
cannot be recovered by importing.

Each item code identifies one product:

- Existing codes are skipped. When a description differs, the report shows the
  Excel description and saved description. Importing again does not update an
  existing product; use **Edit product** to correct it.
- A new code repeated with different descriptions fails for all its conflicting
  rows. Correct those rows before importing again.
- Identical-description duplicates import the first valid occurrence and skip
  subsequent occurrences. A row with an invalid unit/category/stock value does
  not prevent a later valid occurrence from importing.

Formulas use the result saved in the workbook; the importer does not calculate
formulas. Recalculate and save Excel before uploading formula-based descriptions.
Cells containing Excel errors or formulas without saved results fail their rows.

The results panel shows counts plus searchable, paginated skipped and failed rows.
Valid rows can be created even if other rows fail. Database write failures with
known outcomes are included in the row report with accurate created counts.

The description-preservation fix applies to future writes. It does not restore
descriptions already changed by an earlier import. Compare affected item codes
with the original workbook before correcting saved products.

Run the regression tests from `backend` with:

```sh
node --test tests/product-import.test.js
```

These tests read generated Excel workbooks, including 5,601-row `.xlsx` and `.xls`
files, and exercise the real Product schema with mocked database operations.
