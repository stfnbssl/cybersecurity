
# ITTF Format

## A Brief Introduction

The Indented Tree Text Format (ITTF) is a simple, text-based format designed to represent complex hierarchical information nodes. ITTF uses indentation to express relationships between parent and child nodes.

---

## Basic Rules

1. **Keyword and Value**  
   Each line begins with a keyword that defines the meaning of the data, followed by its value. The keyword and value are separated by a space or tab.  
   Example:  
   ```ittf
   address Via E. Torricelli
   ```

2. **Hierarchy Through Indentation**  
   Lines that are indented relative to the previous line are considered its "child" nodes.

3. **Complex Entities**  
   Every node representing a complex entity has exactly one parent node, which provides the entity’s name and, optionally, its ID. Child nodes specify the entity’s attributes and their values.

4. **Child Nodes**  
   A child node can represent either:  
   - A single attribute with its value, or  
   - Another complex entity with its own hierarchy.

---

## Example Representation

Below is an example of how to represent a product order for a supplier using the ITTF format:

```ittf
supplier
    name ABC S.p.A.
    address Via Roma 10
    town Milano
    CAP 20100
    country Italia
    order
        number 12345
        date 2023-10-05
        product
            code P001
            description Laptop
            quantity 10
            price 1500.00
        product
            code P002
            description Mouse
            quantity 50
            price 40.00
        total 15200.00
```

---

## Understanding Relationships  

From the example above, we can infer the following relationships:  
1. A one-to-many relationship exists between `supplier` and `order`.  
2. Similarly, a one-to-many relationship exists between `order` and `product`.

However, an ITTF document does not inherently express relationships or schema information. It is the **Wizzi Schema** that assigns meaning to node names, indicating entities, attributes, and relationships.

---

## Wizzi Schema Integration

The Wizzi schema is described in detail in the file `Wizzi schema.txt`. Wizzi schemas are applied to ITTF documents through the filename:  
- A file named `profile.html.ittf` uses the `html` Wizzi schema.  
- All ITTF documents use the `.ittf` extension, and the segment before `.ittf` specifies the Wizzi schema name.
