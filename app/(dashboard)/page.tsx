'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Order, OrderStatus, ProductType, PaymentMethod } from '@types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function StatisticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    async function fetchOrders() {
      const response = await fetch('/api/orders');
      const data = await response.json();
      setOrders(data.orders);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Cargando...
      </div>
    );
  }

  const filteredOrders =
    orders &&
    orders.filter((order) => {
      const orderDate = new Date(order.orderDate);
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date();
      return orderDate >= start && orderDate <= end;
    });

  const orderStatusData = Object.values(OrderStatus).map((status) => ({
    name: status,
    value:
      filteredOrders &&
      filteredOrders.filter((order) => order.orderStatus === status).length
  }));

  const productTypeData = Object.values(ProductType).map((type) => ({
    name: type,
    value:
      filteredOrders &&
      filteredOrders.filter((order) => order.productType === type).length
  }));

  const paymentMethodData = Object.values(PaymentMethod).map((method) => ({
    name: method,
    value:
      filteredOrders &&
      filteredOrders.filter((order) => order.paymentMethod === method).length
  }));

  const totalRevenue =
    filteredOrders &&
    filteredOrders.reduce(
      (sum, order) => sum + (Number(order.totalPrice) || 0),
      0
    );
  const pendingPayments =
    filteredOrders &&
    filteredOrders
      .filter((order) => order.paymentStatus === 'Pendiente')
      .reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Estadísticas de pedidos</h1>

      <div className="flex space-x-4 mb-4">
        <div>
          <label htmlFor="startDate" className="block">
            Fecha de Inicio
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border p-2"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block">
            Fecha de Fin
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border p-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-semibold">Pedidos por Estado</h2>
          <PieChart width={350} height={250}>
            <Pie data={orderStatusData} fill="#8884d8" dataKey="value">
              {orderStatusData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            Pedidos por Tipo de Producto
          </h2>
          <BarChart width={300} height={300} data={productTypeData} compact>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={45}
              textAnchor="start"
              overflow={'visible'}
              height={100}
            />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#82ca9d" />
          </BarChart>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Métodos de Pago</h2>
        <PieChart width={350} height={250}>
          <Pie data={paymentMethodData} fill="#8884d8" dataKey="value">
            {paymentMethodData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>

      <div className="mt-6 p-4 border rounded-lg shadow-md">
        <h2 className="text-lg font-semibold">Ingresos Totales</h2>
        <p className="text-2xl font-bold text-green-600">
          €{totalRevenue && totalRevenue.toFixed(2)}
        </p>
        <h2 className="text-lg font-semibold mt-4">Pagos Pendientes</h2>
        <p className="text-2xl font-bold text-red-600">
          €{pendingPayments && pendingPayments.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
