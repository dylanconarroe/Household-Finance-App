import { useState } from "react"
import ReceiptReview, {
  type ParsedReceipt,
} from "../components/ReceiptReview"

function ReceiptsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [result, setResult] = useState<ParsedReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleParseReceipt() {
    if (!file) {
      setError("Please select a receipt first.")
      return
    }

    setIsParsing(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch(
        "http://localhost:8000/receipts/parse?household_id=1",
        {
          method: "POST",
          body: formData,
        },
      )

      if (!response.ok) {
        throw new Error("Failed to parse receipt.")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Something went wrong.")
      }
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <>
      <h2 className="text-3xl font-bold">Receipts</h2>

      <p className="mt-2 text-gray-500">
        Upload a receipt to scan and review.
      </p>

      <div className="mt-8 max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold">
          Upload Receipt
        </h3>

        <input
          type="file"
          accept="image/*"
          className="mt-5 block w-full text-sm text-gray-600"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] ?? null
            setFile(selectedFile)
          }}
        />

        {file && (
          <p className="mt-3 text-sm text-gray-500">
            Selected: {file.name}
          </p>
        )}

        <button
          onClick={handleParseReceipt}
          disabled={!file || isParsing}
          className="mt-6 rounded-lg bg-gray-900 px-5 py-3 font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isParsing ? "Parsing..." : "Parse Receipt"}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {result && <ReceiptReview receipt={result} />}
    </>
  )
}

export default ReceiptsPage