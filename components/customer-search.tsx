"use client";

import { useState, useEffect, useRef } from "react";
import { Search, User, X } from "lucide-react";

interface Customer {
  CUSTOMER_ID: string;
  REGION: string;
  AGE: number;
  AGE_GROUP: string;
  GENDER: string;
  INCOME_BRACKET: string;
  HOMEOWNER_STATUS: string;
}

interface CustomerSearchProps {
  onSelectCustomer: (customerId: string) => void;
  selectedCustomerId: string | null;
  onClearSelection: () => void;
}

export function CustomerSearch({ onSelectCustomer, selectedCustomerId, onClearSelection }: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchCustomers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.customers);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer.CUSTOMER_ID);
    setQuery("");
    setIsOpen(false);
  };

  if (selectedCustomerId) {
    return (
      <div className="flex items-center gap-2 bg-[#002F6C]/10 border border-[#002F6C]/30 rounded-lg px-3 py-2">
        <User className="h-4 w-4 text-[#002F6C]" />
        <span className="text-sm font-medium">{selectedCustomerId}</span>
        <button
          onClick={onClearSelection}
          className="ml-2 p-1 hover:bg-[#002F6C]/20 rounded-full transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search customer by ID or address..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full sm:w-80 pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-[#FFDD00] focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-[#002F6C] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full sm:w-96 bg-background border rounded-lg shadow-lg max-h-80 overflow-auto">
          {results.map((customer) => (
            <button
              key={customer.CUSTOMER_ID}
              onClick={() => handleSelect(customer)}
              className="w-full px-4 py-3 text-left hover:bg-muted/50 border-b last:border-b-0 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{customer.CUSTOMER_ID}</span>
                <span className="text-xs text-muted-foreground">{customer.AGE_GROUP}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {customer.REGION}
              </div>
              <div className="flex gap-2 mt-1">
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{customer.GENDER}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{customer.INCOME_BRACKET}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
