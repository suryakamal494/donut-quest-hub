interface PaginationInfoProps {
  page: number;
  pageSize: number;
  totalCount: number;
  label?: string;
}

export function PaginationInfo({ page, pageSize, totalCount, label = "items" }: PaginationInfoProps) {
  if (totalCount === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  return (
    <p className="text-sm text-muted-foreground">
      Showing {from}–{to} of {totalCount} {label}
    </p>
  );
}
