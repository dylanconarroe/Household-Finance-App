type MemberCardProps = {
  name: string
}

function MemberCard({ name }: MemberCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-lg font-semibold">
        {name}
      </h3>
    </div>
  )
}

export default MemberCard