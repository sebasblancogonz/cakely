'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomersTable } from './customers-table';
import { Customer } from '@types';
import Modal from '../common/Modal';
import CustomerForm from './customer-form';
import CustomerDetails from './customer-details';

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const search = searchParams.get('q') || '';
  const offsetParam = Number(searchParams.get('offset')) || 0;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [offset, setOffset] = useState(offsetParam);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const editCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsModalOpen(true);
    setIsEditing(true);
  };

  const showDetails = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsModalOpen(true);
    setIsEditing(false);
  };

  useEffect(() => {
    async function fetchCustomers() {
      const response = await fetch(
        `/api/customers?search=${search}&offset=${offsetParam}`
      );
      const data = await response.json();

      setCustomers(data.customers);
      setOffset(offsetParam);
      setTotalCustomers(data.totalCustomers || data.customers.length);
    }

    fetchCustomers();
  }, [search, offsetParam]);

  return (
    <Tabs
      defaultValue="all"
      className="flex flex-col gap-4 mt-auto overflow-hidden"
    >
      <div className="flex items-center justify-center flex-col gap-4 xs:w-full md:inline-flex md:justify-between md:items-center md:flex-row">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Exportar
            </span>
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1"
            onClick={() => {
              setIsCreating(true);
              setIsModalOpen(true);
            }}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Nuevo cliente
            </span>
          </Button>
        </div>
      </div>

      <TabsContent value="all" className="w-[80%] xs:w-full">
        <CustomersTable
          customers={customers}
          setCustomers={setCustomers}
          editCustomer={editCustomer}
          showDetails={showDetails}
          offset={offset}
          totalCustomers={totalCustomers}
        />
      </TabsContent>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setCustomerToEdit(null);
          setIsModalOpen(false);
        }}
      >
        {isEditing || isCreating ? (
          <CustomerForm
            setIsModalOpen={setIsModalOpen}
            setCustomers={setCustomers}
            setIsEditing={setIsEditing}
            setIsCreating={setIsCreating}
            customerToEdit={isEditing ? customerToEdit : null}
          />
        ) : (
          <CustomerDetails customer={customerToEdit!} />
        )}
      </Modal>
    </Tabs>
  );
}
