namespace Hackaton.Shared.Models
{
    public class Result
    {
        protected Result(bool isSuccess, Error? error)
        {
            IsSuccess = isSuccess;
            Error = error;
        }

        public bool IsSuccess { get; }
        public bool IsFailure => !IsSuccess;
        public Error? Error { get; }

        public static Result Success() => new(true, null);
        public static Result Failure(Error error) => new(false, error);

        public static implicit operator Result(Error error) => Failure(error);
    }

    public class Result<T> : Result
    {
        private readonly T? _value;

        private Result(T value) : base(true, null)
        {
            _value = value;
        }

        private Result(Error error) : base(false, error)
        {
        }

        public T Value => IsSuccess
            ? _value!
            : throw new InvalidOperationException("Nao e possivel acessar Value de um Result com falha");

        public static Result<T> Success(T value) => new(value);
        public static new Result<T> Failure(Error error) => new(error);

        // Permite "return dto;" e "return Error.NotFound(...);" direto no service
        public static implicit operator Result<T>(T value) => Success(value);
        public static implicit operator Result<T>(Error error) => Failure(error);
    }
}
