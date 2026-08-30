export type ReceiptItem = {
  product_code: string | null
  description: string
  original_amount: string
  discount: string
  amount: string
  category: string | null
  category_source: "saved" | "ai" | "unknown"
}

export type ParsedReceipt = {
  merchant: string
  expense_date: string
  subtotal: string
  tax: string
  total: string
  items: ReceiptItem[]
  extracted_subtotal: string
  subtotal_matches: boolean
  total_matches: boolean
}

type ReceiptReviewProps = {
  receipt: ParsedReceipt
  onChange: (receipt: ParsedReceipt) => void
}

function ReceiptReview({
  receipt,
  onChange,
}: ReceiptReviewProps) {
  function updateReceiptField(
    field: "merchant" | "expense_date" | "subtotal" | "tax" | "total",
    value: string,
  ) {
    onChange({
      ...receipt,
      [field]: value,
    })
  }

  function updateItem(
    index: number,
    field: "description" | "amount",
    value: string,
  ) {
    const updatedItems = receipt.items.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, [field]: value }
        : item,
    )

    onChange({
      ...receipt,
      items: updatedItems,
    })
  }

  return (
    <div className="mt-8 max-w-4xl">

      {/* Receipt information */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-2xl font-bold">
          Receipt Review
        </h3>

        <div className="mt-6 grid grid-cols-2 gap-4">

          <div>
            <label className="text-sm text-gray-500">
              Merchant
            </label>

            <input
              type="text"
              value={receipt.merchant}
              onChange={(event) =>
                updateReceiptField("merchant", event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500">
              Date
            </label>

            <input
              type="text"
              value={receipt.expense_date}
              onChange={(event) =>
                updateReceiptField("expense_date", event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500">
              Subtotal
            </label>

            <input
              type="text"
              value={receipt.subtotal}
              onChange={(event) =>
                updateReceiptField("subtotal", event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500">
              Tax
            </label>

            <input
              type="text"
              value={receipt.tax}
              onChange={(event) =>
                updateReceiptField("tax", event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500">
              Total
            </label>

            <input
              type="text"
              value={receipt.total}
              onChange={(event) =>
                updateReceiptField("total", event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

        </div>
      </div>

      {/* Receipt items */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-xl font-semibold">
          Items
        </h3>

        <div className="mt-4 divide-y divide-gray-200">
          {receipt.items.map((item, index) => (
            <div
              key={`${item.product_code ?? "item"}-${index}`}
              className="flex items-center justify-between py-4"
            >
              <div className="flex-1">

                <input
                  type="text"
                  value={item.description}
                  onChange={(event) =>
                    updateItem(
                      index,
                      "description",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-medium"
                />

                {item.product_code && (
                  <p className="mt-1 text-sm text-gray-400">
                    Product code: {item.product_code}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {item.category ?? "No category"}
                  </span>

                  <CategorySourceBadge
                    source={item.category_source}
                  />
                </div>

                {Number(item.discount) > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    Original ${item.original_amount} − $
                    {item.discount} discount
                  </p>
                )}

              </div>

              <div className="ml-6">
                <label className="text-xs text-gray-400">
                  Amount
                </label>

                <input
                  type="text"
                  value={item.amount}
                  onChange={(event) =>
                    updateItem(
                      index,
                      "amount",
                      event.target.value,
                    )
                  }
                  className="mt-1 w-24 rounded-lg border border-gray-300 px-3 py-2 text-right"
                />
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Validation */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold">
          Receipt Validation
        </h3>

        <div className="mt-4 space-y-2">
          <p>
            Subtotal check:{" "}
            <span
              className={
                receipt.subtotal_matches
                  ? "font-medium text-green-600"
                  : "font-medium text-red-600"
              }
            >
              {receipt.subtotal_matches ? "Passed" : "Failed"}
            </span>
          </p>

          <p>
            Total check:{" "}
            <span
              className={
                receipt.total_matches
                  ? "font-medium text-green-600"
                  : "font-medium text-red-600"
              }
            >
              {receipt.total_matches ? "Passed" : "Failed"}
            </span>
          </p>
        </div>
      </div>

    </div>
  )
}

function CategorySourceBadge({
  source,
}: {
  source: ReceiptItem["category_source"]
}) {
  const styles = {
    saved: "bg-green-100 text-green-700",
    ai: "bg-blue-100 text-blue-700",
    unknown: "bg-yellow-100 text-yellow-700",
  }

  const labels = {
    saved: "Saved",
    ai: "AI suggestion",
    unknown: "Needs category",
  }

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${styles[source]}`}
    >
      {labels[source]}
    </span>
  )
}

export default ReceiptReview