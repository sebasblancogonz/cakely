import { Customer } from '@types';
import DetailsTable from '@/components/common/DetailsTable';
import Link from 'next/link';

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
      label: 'Conversación',
      value: (
        <>
          <Link
            className="text-blue-500"
            target="_blank"
            rel="noreferrer noopener"
            href={'https://wa.me/' + customer.phone}
          >
            WhatsApp
          </Link>
          {customer.instagramHandle && (
            <>
              {' '}
              |{' '}
              <Link
                target="_blank"
                className="text-blue-500"
                rel="noreferrer noopener"
                href={'https://ig.me/m/' + customer.instagramHandle}
              >
                Instagram
              </Link>
            </>
          )}
        </>
      ),
      key: 'conversation'
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
