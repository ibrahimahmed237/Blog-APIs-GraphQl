import React, { Component, Fragment } from "react";
import openSocket from "socket.io-client";
import Post from "../../components/Feed/Post/Post";
import Button from "../../components/Button/Button";
import FeedEdit from "../../components/Feed/FeedEdit/FeedEdit";
import Input from "../../components/Form/Input/Input";
import Paginator from "../../components/Paginator/Paginator";
import Loader from "../../components/Loader/Loader";
import ErrorHandler from "../../components/ErrorHandler/ErrorHandler";
import "./Feed.css";

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: "",
    postPage: 1,
    postsLoading: true,
    editLoading: false,
  };

  componentDidMount() {
    const graphqlQuery = {
      query: `query { status }`,
    };
    fetch("http://localhost:8080/graphql", {
      headers: {
        authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
      method: "POST",
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        // console.log(resData);
        this.setState({ status: resData.data.status });
      })
      .catch(this.catchError);

    this.loadPosts();
    // const socket = openSocket("http://localhost:8080");
    // socket.on("posts", (data) => {
    //   if (data.action === "create") {
    //     this.addPost(data.post);
    //   } else if (data.action === "update") {
    //     this.updatePost(data.post);
    //   } else if (data.action === "delete") {
    //     this.loadPosts();
    //   }
    // });
  }

  addPost = (post) => {
    this.setState((prevState) => {
      const updatedPosts = [...prevState.posts];
      if (prevState.postPage === 1) {
        if (Array.isArray(updatedPosts) && updatedPosts.length >= 2) {
          updatedPosts.pop();
        }
        updatedPosts.unshift(post);
      }
      return {
        posts: updatedPosts,
        totalPosts: prevState.totalPosts + 1,
      };
    });
  };

  updatePost = (post) => {
    this.setState((prevState) => {
      const updatedPosts = [...prevState.posts];
      if (prevState.postPage === 1) {
        if (Array.isArray(updatedPosts)) {
          const updatedPostIndex = updatedPosts.findIndex(
            (p) => p._id === post._id
          );
          if (updatedPostIndex > -1) {
            updatedPosts[updatedPostIndex] = post;
          }
        }
      }
      return {
        posts: updatedPosts,
      };
    });
  };

  loadPosts = (direction) => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === "next") {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === "previous") {
      page--;
      this.setState({ postPage: page });
    }
    let graphqlQuery = {
      query: `
      query { posts(page: ${page})
        {  posts{_id
          title
          content
          creator {
            name
            _id
          }
          image {
            imageUrl
            _id
          }
          createdAt
        }
          totalPosts
        }
      }
      `,
    };
    fetch("http://localhost:8080/graphql", {
      headers: {
        authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
      method: "POST",
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        if (resData.errors) {
          throw new Error("Fetching posts failed!");
        }
        this.setState({
          posts: resData.data.posts.posts,
          totalPosts: resData.data.posts.totalPosts,
          postsLoading: false,
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = (event) => {
    event.preventDefault();
    const graphqlQuery = {
      query: `
      mutation { updateStatus(status: "${this.state.status}") {
        status
      }
    }
      `,
    };
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "Bearer " + this.props.token,
      },
      body: JSON.stringify(graphqlQuery),
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        // console.log(resData);
        if (resData.errors) {
          throw new Error("Can't update status!");
        }
        this.setState({ status: resData.data.updateStatus.status });

      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = (postId) => {
    this.setState((prevState) => {
      const loadedPost = { ...prevState.posts.find((p) => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost,
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = (postData) => {
    this.setState({
      editLoading: true,
    });
    const formData = new FormData();
    formData.append("image", postData.image);
    fetch("http://localhost:8080/post-image", {
      method: "PUT",
      headers: {
        authorization: "Bearer " + this.props.token,
      },
      body: formData,
    })
      .then((res) => {
        return res.json();
      })
      .then((FileData) => {
        if (FileData.errors) {
          throw new Error("Image upload failed!");
        }
        let imageUrl, imageId;
        if (FileData.image) {
          imageUrl = FileData.image.imageUrl;
          imageId = FileData.image._id;
        } else {
          imageUrl = "UNDEFINED";
          imageId = "UNDEFINED";
        }
        let url = "http://localhost:8080/graphql";
        let graphqlQuery = {
          query: `
      mutation { createPost(postInput: {title: "${postData.title}", content: "${postData.content}", image: {imageUrl: "${imageUrl}", _id: "${imageId}"}})   
        { _id 
          title 
          content
          creator{name _id}
          image{imageUrl _id}
          createdAt
          updatedAt
        } 
      }
      `,
        };
        if (this.state.editPost) {
          graphqlQuery = {
            query: `
      mutation { updatePost(id: "${this.state.editPost._id}", postInput: {title: "${postData.title}", content: "${postData.content}", image: {imageUrl: "${imageUrl}", _id: "${imageId}"}})
            
        { _id 
          title
          content
          creator{name _id}
          image{imageUrl _id}
          createdAt
          updatedAt
        }
      }
      `,
          };
        }

        fetch(url, {
          method: "POST",
          headers: {
            authorization: "Bearer " + this.props.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(graphqlQuery),
        })
          .then((res) => {
            return res.json();
          })
          .then(resData=> {
            console.log(resData.errors);
            if (resData.errors && resData.errors[0].status === 422) {
              throw new Error("Validation failed.");
            }
            if (resData.errors) {
              throw new Error("Creating or editing a post failed!");
            }
            let newPostData = resData.data.createPost;
            if (this.state.editPost) newPostData = resData.data.updatePost;

            const post = {
              _id: newPostData._id,
              title: newPostData.title,
              content: newPostData.content,
              creator: newPostData.creator,
              createdAt: newPostData.createdAt,
              updatedAt: newPostData.updatedAt,
              image: {
                imageUrl: newPostData.imageUrl,
                _id: newPostData._id,
              },
            };
            this.setState((prevState) => {
              let updatedPosts = [...prevState.posts];
              if (prevState.editPost) {
                const postIndex = prevState.posts.findIndex(
                  (p) => p._id === prevState.editPost._id
                );
                updatedPosts[postIndex] = post;
              } else {
                updatedPosts.unshift(post);
                if (updatedPosts.length > 2) {
                  updatedPosts.pop();
                }
              }
              return {
                posts: updatedPosts,
                isEditing: false,
                editPost: null,
                editLoading: false,
              };
            });
          });
      })
      .catch((err) => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err,
        });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = (postId) => {
    this.setState({ postsLoading: true });
    const graphqlQuery = {
      query: `
      mutation { deletePost(id: "${postId}") }
      `,
    };
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        // console.log(resData);
        if (resData.errors) {
          throw new Error("Deleting a post failed!");
        }
        this.loadPosts();
      })
      .catch((err) => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = (error) => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <Loader />
            </div>
          )}
          {Array.isArray(this.state.posts) &&
          this.state.posts.length <= 0 &&
          !this.state.postsLoading ? (
            <p style={{ textAlign: "center" }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, "previous")}
              onNext={this.loadPosts.bind(this, "next")}
              lastPage={Math.ceil(
                this.state.totalPosts ? this.state.totalPosts / 2 : 1
              )}
              currentPage={this.state.postPage}
            >
              {Array.isArray(this.state.posts) &&
                this.state.posts.map((post) => (
                  <Post
                    key={post._id}
                    id={post._id}
                    author={post.creator && post.creator.name}
                    canEdit={post.creator._id === this.props.userId}
                    date={
                      post.createdAt &&
                      new Date(post.createdAt).toLocaleDateString("en-US")
                    }
                    title={post.title}
                    image={post.image}
                    content={post.content}
                    onStartEdit={
                      post.creator && post.creator._id === this.props.userId
                        ? this.startEditPostHandler.bind(this, post._id)
                        : null
                    }
                    onDelete={
                      post.creator && post.creator._id === this.props.userId
                        ? this.deletePostHandler.bind(this, post._id)
                        : null
                    }
                  />
                ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
