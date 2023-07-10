import { createAction, createReducer, current, nanoid, createSlice, PayloadAction, createAsyncThunk, AsyncThunk } from "@reduxjs/toolkit";
import { initalPostList } from "constants/blog";
import { Post } from "types/blog.type";
import http from "utils/http";

interface BlogState {
  postList: Post[],
  editingPost: Post | null,
  loading: boolean,
  currentRequestId : undefined | string
}

type GenericAsyncThunk = AsyncThunk<unknown, unknown, any>

type PendingAction = ReturnType<GenericAsyncThunk['pending']>
type RejectedAction = ReturnType<GenericAsyncThunk['rejected']>
type FulfilledAction = ReturnType<GenericAsyncThunk['fulfilled']>

const initalState: BlogState = {
  postList: initalPostList,
  editingPost: null,
  loading: false,
  currentRequestId: undefined
}

export const getPostList = createAsyncThunk(
  'blog/getPostList',
  async (_, thunkAPI) => {
    const response = await http.get<Post[]>('posts', {
      signal: thunkAPI.signal
    })
    return response.data
  }
)

export const addPost = createAsyncThunk(
  'blog/addPost',
  async (body: Omit<Post, "id">, thunkAPI) => {
    try {
      const response = await http.post<Post>('posts', body, {
        signal: thunkAPI.signal
      })
      return response.data
    } catch (error: any) {
      if(error.name === 'AxiosError' && error.response.status === 422) {
        return thunkAPI.rejectWithValue(error.response.data)
      }
      throw error;
    }
  }
)

export const updatePost = createAsyncThunk(
  'blog/updatePost',
  async ({postId, body} : {postId: string, body: Post}, thunkAPI) => {
    try {
      const response = await http.put<Post>(`posts/${postId}`, body, {
        signal: thunkAPI.signal
      })
      return response.data
    } catch (error: any) {
      if(error.name === 'AxiosError' && error.response.status === 422) {
        return thunkAPI.rejectWithValue(error.response.data)
      }
      throw error;
    }
  }
)

export const deletePost = createAsyncThunk(
  'blog/deletePost', 
  async (postId: string, thunkAPI) => {
    const response = await http.delete<string>(`posts/${postId}`, {
      signal: thunkAPI.signal
    })
    return response.data
  }
  )


const blogSlice = createSlice({
  name: 'blog',
  initialState: initalState,
  reducers: {

    startEditingPost: (state, action) => {
      const postId = action.payload;
      const foundPost = state.postList.find(post => post.id === postId) || null
      state.editingPost = foundPost
    }, 
    cancelEditingPost: (state) => {
      state.editingPost = null
    },
  },
  extraReducers(builder) {
    builder
      .addCase(getPostList.fulfilled, (state, action) => {state.postList = action.payload})
      .addCase(addPost.fulfilled, (state, action) => {state.postList.push(action.payload)})
      .addCase(updatePost.fulfilled, (state, action) => {
        // state.postList.push(action.payload)
        state.postList.find((post, index) => {
          if(post.id === action.payload.id) {
            state.postList[index] = action.payload
            return true;
          }
          return false
        })
        state.editingPost = null
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        const deletePostIndex = state.postList.findIndex(item => item.id === action.meta.arg)
        if(deletePostIndex !== -1)
        state.postList.splice(deletePostIndex, 1)})
      .addMatcher<PendingAction>(
        (action) => action.type.endsWith("/pending"),
        (state, action) => {
            state.loading = true
            state.currentRequestId = action.meta.requestId
      })
      .addMatcher<RejectedAction>(
        (action) => action.type.endsWith("/rejected"),
        (state, action) => {
          if(state.loading && state.currentRequestId === action.meta.requestId) {
            state.loading = false
            state.currentRequestId = undefined
          }
      })
      .addMatcher<FulfilledAction>(
        (action) => action.type.endsWith("/fulfilled"),
        (state, action) => {
          if(state.loading && state.currentRequestId === action.meta.requestId) {
            state.loading = false
            state.currentRequestId = undefined

          }
      })
      .addDefaultCase((state, action) => {
        console.log(`action type: ${current(state)}`);
        
      })
  }
})

const blogReducer = blogSlice.reducer;

export const {cancelEditingPost, startEditingPost} = blogSlice.actions
export default blogReducer