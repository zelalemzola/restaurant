// Product Group individual operations API routes
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ProductGroup, Product } from '@/lib/models';
import { productGroupSchema } from '@/lib/validations';

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const productGroup = await ProductGroup.findById(id);
    
    if (!productGroup) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product group not found'
        }
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    const response: ApiResponse<typeof productGroup> = {
      success: true,
      data: productGroup
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching product group:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch product group'
      }
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate request body
    const validatedData = productGroupSchema.parse(body);
    
    await connectDB();
    
    // Check if product group exists
    const existingGroup = await ProductGroup.findById(id);
    if (!existingGroup) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product group not found'
        }
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Check if another product group with same name already exists (excluding current one)
    const duplicateGroup = await ProductGroup.findOne({ 
      name: validatedData.name,
      _id: { $ne: id }
    });
    if (duplicateGroup) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'DUPLICATE_NAME',
          message: 'Product group with this name already exists'
        }
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const updatedGroup = await ProductGroup.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    );
    
    const response: ApiResponse<typeof updatedGroup> = {
      success: true,
      data: updatedGroup
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating product group:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error
        }
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update product group'
      }
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    
    // Check if product group exists
    const existingGroup = await ProductGroup.findById(id);
    if (!existingGroup) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product group not found'
        }
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Check if there are products associated with this group
    const productsCount = await Product.countDocuments({ groupId: id });
    if (productsCount > 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'HAS_DEPENDENCIES',
          message: `Cannot delete product group. ${productsCount} product(s) are still associated with this group.`
        }
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    await ProductGroup.findByIdAndDelete(id);
    
    const response: ApiResponse<void> = {
      success: true,
      data: undefined
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting product group:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete product group'
      }
    };
    return NextResponse.json(response, { status: 500 });
  }
}