import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { SelectOrder } from '@/lib/db';
import { deleteProduct } from '../actions';

export function Order({ order }: { order: SelectOrder }) {
  return (
    <TableRow>
      <TableCell className="hidden sm:table-cell">
        {order.id}
      </TableCell>
      <TableCell className="font-medium">{order.customerName}</TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {order.orderStatus}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">{`$${order.customerContact}`}</TableCell>
      <TableCell className="hidden md:table-cell">{order.productType}</TableCell>
      <TableCell className="hidden md:table-cell">
        {order.orderDate.toLocaleDateString("en-US")}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>
              <form action={deleteProduct}>
                <button type="submit">Delete</button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
