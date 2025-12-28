// Product Groups API routes
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ProductGroup } from '@/lib/models';
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

export async function GET() {
  try {
    await connectDB();
    const productGroups = await ProductGroup.find().sort({ name: 1 });
    
    const response: ApiResponse<typeof productGroups> = {
      success: true,
      data: productGroups
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching product groups:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch product groups'
      }
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = productGroupSchema.parse(body);
    
    await connectDB();
    
    // Check if product group with same name already exists
    const existingGroup = await ProductGroup.findOne({ name: validatedData.name });
    if (existingGroup) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'DUPLICATE_NAME',
          message: 'Product group with this name already exists'
        }
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const productGroup = new ProductGroup(validatedData);
    await productGroup.save();
    
    const response: ApiResponse<typeof productGroup> = {
      success: true,
      data: productGroup
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating product group:', error);
    
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
        code: 'CREATE_ERROR',
        message: 'Failed to create product group'
      }
    };
    return NextResponse.json(response, { status: 500 });
  }
}