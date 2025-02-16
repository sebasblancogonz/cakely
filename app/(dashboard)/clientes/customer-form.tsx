import { Button } from '@/components/ui/button';
import { Customer } from '@types';
import { PaymentMethod, ProductType, PaymentStatus } from '@types';

const CustomerForm = ({
  setIsModalOpen,
  setCustomers,
  customerToEdit
}: {
  setIsModalOpen: (value: boolean) => void;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  customerToEdit: Customer | null;
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    if (customerToEdit) {
      const customer: Customer = buildCustomer(formData, customerToEdit);
      updateCustomer(customer);
    } else {
      const customer: Customer = buildCustomer(formData, null);
      saveCustomer(customer);
    }
  };

  const getFormValue = <T,>(
    formData: FormData,
    key: string,
    defaultValue: T
  ): T => {
    return (formData.get(key) as T) ?? defaultValue;
  };

  const buildCustomer = (
    formData: FormData,
    existingCustomer: Customer | null
  ): Customer => {
    if (existingCustomer) {
      const updatedCustomer: Partial<Customer> = {};
      let hasChanges = false;

      const fieldTransformers: Record<
        keyof Customer,
        (value: FormDataEntryValue) => any
      > = {
        id: (value) => value, // No se actualiza
        name: (value) => value.toString(),
        email: (value) => value.toString(),
        phone: (value) => value.toString(),
        registrationDate: (value) => new Date(value.toString()),
        notes: (value) => value.toString()
      };

      for (const field in fieldTransformers) {
        const key = field as keyof Customer;
        const formValue = formData.get(field);

        if (formValue !== null) {
          const transformedValue = fieldTransformers[key](formValue);

          if (transformedValue !== existingCustomer[key]) {
            updatedCustomer[key] = transformedValue;
            hasChanges = true;
          }
        }
      }

      return hasChanges
        ? { ...existingCustomer, ...updatedCustomer }
        : existingCustomer;
    }

    return {
      id: undefined,
      name: getFormValue(formData, 'name', ''),
      email: getFormValue(formData, 'email', ''),
      phone: getFormValue(formData, 'phone', ''),
      notes: getFormValue(formData, 'notes', ''),
      registrationDate: new Date()
    };
  };

  async function saveCustomer(customer: Customer) {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customer)
    });

    if (response.ok) {
      setCustomers((customers) => [...customers, customer]);
      setIsModalOpen(false);
    }
  }

  async function updateCustomer(customer: Customer) {
    const response = await fetch(`/api/customers/${Number(customer.id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customer)
    });

    if (response.ok) {
      setCustomers((customers) =>
        customers.map((o) => (o.id === customer.id ? customer : o))
      );
      setIsModalOpen(false);
    }
  }

  return (
    <>
      <h2 className="text-lg font-semibold leading-none tracking-tight mb-4">
        {customerToEdit ? 'Editar Pedido' : 'Nuevo Pedido'}
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <InputField
          label="Cliente"
          name="name"
          placeholder="Nombre del cliente"
          defaultValue={customerToEdit?.name}
        />
        <InputField
          label="Email del cliente"
          name="email"
          placeholder="Email"
          defaultValue={customerToEdit?.email}
        />
        <InputField
          label="Teléfono del cliente"
          name="phone"
          placeholder="Teléfono"
          defaultValue={customerToEdit?.phone}
        />
        <TextAreaField
          label="Notas"
          name="notes"
          placeholder="Notas"
          defaultValue={customerToEdit?.notes}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsModalOpen(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" className="ml-2">
            Guardar
          </Button>
        </div>
      </form>
    </>
  );
};

const InputField = ({
  label,
  name,
  type = 'text',
  placeholder,
  defaultValue
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      name={name}
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
    />
  </div>
);

const TextAreaField = ({
  label,
  name,
  placeholder,
  defaultValue
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <textarea
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
    />
  </div>
);

export default CustomerForm;
