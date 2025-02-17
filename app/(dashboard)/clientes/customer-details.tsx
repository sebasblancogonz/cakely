import { Customer } from '@types';
import DetailsTable from '../common/DetailsTable';

const CustomerDetails = ({ customer }: { customer: Customer }) => {
  const customerDetails = [
    {
      label: 'Nombre',
      value: customer.name,
      key: 'name'
    },
    {
      label: 'Email',
      value: customer.email,
      key: 'email'
    },
    {
      label: 'Teléfono',
      value: customer.phone,
      key: 'phone'
    },
    {
      label: 'Fecha de registro',
      value: customer.registrationDate.toString(),
      key: 'registrationDate'
    },
    {
      label: 'Notas',
      value: customer.notes,
      key: 'notes'
    }
  ];

  return <DetailsTable data={customerDetails} />;
};

export default CustomerDetails;
