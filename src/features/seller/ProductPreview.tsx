import { useState } from 'react'
export function ProductPreview({
  title,
  description,
  imageUrl,
  attributes,
}: {
  title: string
  description: string | null
  imageUrl: string | null
  attributes: unknown
}) {
  const [failed, setFailed] = useState(false)
  const image = imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : null
  return (
    <div className="product-preview">
      {image && !failed ? (
        <img src={image} alt={title} onError={() => setFailed(true)} />
      ) : null}
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        <details>
          <summary>Ver atributos do produto</summary>
          <pre>{JSON.stringify(attributes, null, 2)}</pre>
        </details>
      </div>
    </div>
  )
}
