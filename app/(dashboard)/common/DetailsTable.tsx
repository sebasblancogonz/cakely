import {
  Table,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';

const DetailsTable = ({
  data
}: {
  data: { label: string; value: any; key: string }[];
}) => {
  return (
    <Table>
      <TableBody>
        {data.map(({ label, value, key }) => (
          <TableRow key={key}>
            <TableHead>{label}</TableHead>
            <TableCell>{value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default DetailsTable;
