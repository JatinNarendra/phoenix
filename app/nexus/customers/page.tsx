"use client";
import React, { useState, useRef } from "react";
import CustomerTable from "../components/CustomerTable";
import AddCustomerModal from "../components/AddCustomerModal";
import { CustomerTableRef } from "../components/CustomerTable";

export default function CustomersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const tableRef = useRef<CustomerTableRef>(null);

  const handleCustomerAdded = async () => {
    if (tableRef.current) {
      await tableRef.current.fetchCustomers();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <CustomerTable ref={tableRef} />
      </div>

      {/* Modal */}
      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          handleCustomerAdded();
        }}
      />
    </div>
  );
}
